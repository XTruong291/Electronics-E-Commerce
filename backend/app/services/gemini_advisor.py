import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud.analytics import build_store_grounding_context, find_best_matching_products
from app.schemas.analytics import (
    AdminAIChatRequest,
    AdminAIChatResponse,
    AnalyticsOverviewResponse,
    GeminiInsightsResponse,
)

logger = logging.getLogger(__name__)

# In-Memory Cache cho AI Insights (TTL 5 phút / 300 giây)
_insights_cache: Dict[str, Any] = {}
_INSIGHTS_CACHE_TTL_SECONDS = 300

# Thread Lock chống duplicate concurrent requests tới Gemini Insights
_insights_lock = threading.Lock()

# Cache cho ListModels tự động khám phá model Gemini (TTL 1 giờ / 3600 giây)
_models_cache: Dict[str, Any] = {"models": [], "timestamp": 0}
_MODELS_CACHE_TTL_SECONDS = 3600
_models_lock = threading.Lock()

EXCLUDED_MODEL_KEYWORDS = [
    "tts",
    "image",
    "transcribe",
    "robotics",
    "customtools",
    "computer-use",
    "banana",
    "argon",
]


def _get_available_gemini_models(api_key: str) -> List[str]:
    """Tự động khám phá và xếp hạng các model Gemini hợp lệ từ Google Generative Language API với cache 1 giờ."""
    now = time.time()
    with _models_lock:
        if (
            _models_cache["models"]
            and (now - _models_cache["timestamp"]) < _MODELS_CACHE_TTL_SECONDS
        ):
            return list(_models_cache["models"])

    # Danh sách dự phòng an toàn nếu gọi API ListModels thất bại
    fallback_models: List[str] = []
    if settings.GEMINI_MODEL:
        fallback_models.append(settings.GEMINI_MODEL.strip())
    for fb in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-latest"]:
        if fb not in fallback_models:
            fallback_models.append(fb)

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                logger.warning(
                    "Không thể truy vấn danh sách model Gemini (HTTP %s). Sử dụng danh sách model dự phòng.",
                    resp.status_code,
                )
                return fallback_models

            models_data = resp.json().get("models", [])
            valid_models: List[str] = []
            for m in models_data:
                name = m.get("name", "").replace("models/", "").strip()
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" not in methods:
                    continue
                if "gemini" not in name.lower():
                    continue
                if any(kw in name.lower() for kw in EXCLUDED_MODEL_KEYWORDS):
                    continue
                valid_models.append(name)

            if not valid_models:
                return fallback_models

            preferred = settings.GEMINI_MODEL.strip() if settings.GEMINI_MODEL else ""
            flash_lite_models = [m for m in valid_models if "flash" in m.lower() and "lite" in m.lower()]
            flash_lite_models.sort(reverse=True)
            flash_models = [m for m in valid_models if "flash" in m.lower() and "lite" not in m.lower()]
            flash_models.sort(reverse=True)
            other_models = [m for m in valid_models if m not in flash_lite_models and m not in flash_models]
            other_models.sort(reverse=True)

            ordered: List[str] = []
            if preferred and preferred in valid_models:
                ordered.append(preferred)

            for m in flash_lite_models + flash_models + other_models:
                if m not in ordered:
                    ordered.append(m)

            with _models_lock:
                _models_cache["models"] = ordered
                _models_cache["timestamp"] = now

            logger.info("Đã khám phá %d model Gemini hợp lệ từ Google API: %s", len(ordered), ordered[:5])
            return ordered

    except Exception as exc:
        logger.warning("Lỗi khi khám phá model Gemini (%s). Sử dụng danh sách dự phòng.", exc)
        return fallback_models


def get_cached_insights(overview: AnalyticsOverviewResponse) -> Optional[GeminiInsightsResponse]:
    total_events = overview.total_events_recorded
    total_orders = overview.funnel.total_orders
    cache_key = f"{overview.days}_{total_events}_{total_orders}"
    cached = _insights_cache.get(cache_key)
    if cached:
        age = time.time() - cached.get("timestamp", 0)
        if age < _INSIGHTS_CACHE_TTL_SECONDS:
            logger.info("Trả về AI Insights từ bộ nhớ đệm In-Memory Cache (key: %s, age: %.1fs)", cache_key, age)
            return cached["response"]
    return None


def set_cached_insights(overview: AnalyticsOverviewResponse, response: GeminiInsightsResponse) -> None:
    total_events = overview.total_events_recorded
    total_orders = overview.funnel.total_orders
    cache_key = f"{overview.days}_{total_events}_{total_orders}"
    _insights_cache[cache_key] = {
        "response": response,
        "timestamp": time.time(),
    }


def rule_based_fallback(overview: AnalyticsOverviewResponse) -> GeminiInsightsResponse:
    """Tự động phân tích dữ liệu dựa trên các quy tắc heuristic thông minh khi không có Gemini API key."""
    funnel = overview.funnel
    high_dropoff = overview.high_dropoff_products
    top_selling = overview.top_selling_products
    slow_moving = overview.slow_moving_products
    cat_interest = overview.category_interest
    brand_interest = overview.brand_interest
    top_searches = overview.top_search_keywords

    # 1. Executive Summary
    if funnel.total_views == 0 and not top_selling:
        exec_sum = (
            "Hệ thống vừa được khởi tạo dữ liệu theo dõi hành vi và doanh thu. Hãy tiếp tục quan sát "
            "khi có thêm lượt truy cập và đơn hàng trong những ngày tới."
        )
    else:
        best_seller_text = f" Mặt hàng bán chạy nhất là '{top_selling[0].product_name}' ({top_selling[0].units_sold} sản phẩm)." if top_selling else ""
        exec_sum = (
            f"Trong {overview.days} ngày qua, cửa hàng ghi nhận {funnel.total_views:,} lượt xem sản phẩm, "
            f"{funnel.total_cart_adds:,} lượt thêm giỏ và {funnel.total_orders:,} đơn hàng thành công. "
            f"Tỷ lệ chuyển đổi tổng thể đạt {funnel.overall_conversion_pct}% "
            f"(chuyển đổi từ thêm giỏ sang tạo đơn đạt {funnel.cart_to_order_pct}%).{best_seller_text}"
        )

    # 2. Dropoff Analysis
    if high_dropoff:
        top_d = high_dropoff[0]
        dropoff_text = (
            f"Mặt hàng '{top_d.product_name}' ({top_d.brand}) đang ghi nhận tỷ lệ bỏ giỏ cao nhất "
            f"({top_d.dropoff_rate_pct}% với {top_d.cart_adds} lượt thêm giỏ nhưng chỉ bán được {top_d.units_sold} máy). "
            f"Tâm lý khách hàng thường phân vân ở phân khúc giá {top_d.price:,.0f} ₫ do thiếu ưu đãi quà tặng hoặc "
            f"chính sách hỗ trợ trả góp 0% chưa đủ nổi bật."
        )
    else:
        dropoff_text = (
            "Tỷ lệ chuyển đổi giữa các bước thêm giỏ và thanh toán hiện duy trì ở mức cân bằng. "
            "Chưa phát hiện sản phẩm có tỷ lệ bỏ giỏ bất thường."
        )

    # 3. Trend Insights
    top_cat_name = cat_interest[0].category_name if cat_interest else "Thiết bị công nghệ"
    top_brand_name = brand_interest[0].brand if brand_interest else "Thương hiệu nổi bật"
    top_search_kw = top_searches[0].keyword if top_searches else "Sản phẩm hot"

    trend_text = (
        f"Thị hiếu khách hàng đang tập trung mạnh nhất vào danh mục '{top_cat_name}' và thương hiệu '{top_brand_name}'. "
        f"Từ khóa được tìm kiếm nhiều nhất là '{top_search_kw}' ({top_searches[0].search_count if top_searches else 0} lượt tra cứu), "
        f"cho thấy nhu cầu mua sắm nâng cấp phần cứng thế hệ mới đang có xu hướng tăng rõ rệt."
    )

    # 4. Actionable Recommendations
    recommendations = []
    # Cảnh báo tồn kho Best Sellers
    low_stock_sellers = [p for p in top_selling if p.current_stock <= 5]
    if low_stock_sellers:
        p_low = low_stock_sellers[0]
        recommendations.append(
            f"Cảnh báo tồn kho: Mặt hàng bán chạy '{p_low.product_name}' chỉ còn {p_low.current_stock} chiếc trong kho. Cần đặt hàng bổ sung khẩn cấp để tránh đứt hàng."
        )

    # Khuyến nghị xử lý hàng tồn đọng / Dead stock
    dead_stocks = [p for p in slow_moving if p.aging_status == "DEAD_STOCK"]
    if dead_stocks:
        top_dead = dead_stocks[0]
        recommendations.append(
            f"Giải phóng dòng tiền: Mặt hàng '{top_dead.product_name}' tồn {top_dead.current_stock} chiếc ({top_dead.inventory_value:,.0f} ₫ vốn) đã {top_dead.days_in_stock} ngày chưa phát sinh đơn. Nên kích hoạt Flash Sale hoặc tặng kèm voucher bảo hành."
        )
    elif high_dropoff:
        recommendations.append(
            f"Thiết lập voucher giảm giá nhanh 3-5% hoặc tặng kèm gói bảo hành mở rộng cho '{high_dropoff[0].product_name}' để kích cầu chốt đơn."
        )

    recommendations.append(
        f"Ghim nổi bật các sản phẩm thuộc danh mục '{top_cat_name}' và thương hiệu '{top_brand_name}' lên vị trí Spotlight trang chủ."
    )
    if top_searches:
        recommendations.append(
            f"Tối ưu trang kết quả tìm kiếm cho từ khóa hot '{top_search_kw}' và bổ sung bài viết tin công nghệ liên quan trên Blog."
        )

    recommendations.append(
        "Kích hoạt thông báo nhắc nhở giỏ hàng chưa thanh toán (Cart Abandonment Email/Push) sau 2 giờ để thu hồi đơn hàng tiềm năng."
    )

    return GeminiInsightsResponse(
        source="rule_based_fallback",
        model="Rule-Based Business Advisor",
        executive_summary=exec_sum,
        dropoff_analysis=dropoff_text,
        trend_insights=trend_text,
        actionable_recommendations=recommendations,
        generated_at=datetime.now(timezone.utc),
    )


def generate_gemini_insights(overview: AnalyticsOverviewResponse) -> GeminiInsightsResponse:
    """Tạo phân tích chiến lược kinh doanh qua Google Gemini API (với In-Memory Cache, Double-Checked Lock & Dynamic Model Discovery)."""
    # 1. Kiểm tra nhanh In-Memory Cache ngoài lock (Fast path)
    cached = get_cached_insights(overview)
    if cached:
        return cached

    # 2. Sử dụng Threading Lock để chống race condition / duplicate requests khi Frontend gọi đồng thời
    with _insights_lock:
        # Double-check cache trong lock
        cached = get_cached_insights(overview)
        if cached:
            return cached

        api_key = settings.GEMINI_API_KEY.strip()
        if not api_key:
            logger.info("Chưa cấu hình GEMINI_API_KEY. Sử dụng bộ phân tích Heuristic Fallback.")
            fallback_res = rule_based_fallback(overview)
            set_cached_insights(overview, fallback_res)
            return fallback_res

        try:
            # Chuẩn bị dữ liệu tóm lược cho Gemini
            data_summary: Dict[str, Any] = {
                "time_range_days": overview.days,
                "funnel": {
                    "total_views": overview.funnel.total_views,
                    "total_cart_adds": overview.funnel.total_cart_adds,
                    "total_orders": overview.funnel.total_orders,
                    "view_to_cart_pct": overview.funnel.view_to_cart_pct,
                    "cart_to_order_pct": overview.funnel.cart_to_order_pct,
                    "overall_conversion_pct": overview.funnel.overall_conversion_pct,
                },
                "high_dropoff_products": [
                    {
                        "name": p.product_name,
                        "brand": p.brand,
                        "price_vnd": p.price,
                        "views": p.views,
                        "cart_adds": p.cart_adds,
                        "units_sold": p.units_sold,
                        "dropoff_rate_pct": p.dropoff_rate_pct,
                        "status": p.status_flag,
                    }
                    for p in overview.high_dropoff_products[:5]
                ],
                "top_selling_products": [
                    {
                        "name": p.product_name,
                        "brand": p.brand,
                        "units_sold": p.units_sold,
                        "order_count": p.order_count,
                        "gross_revenue_vnd": p.gross_revenue,
                        "current_stock": p.current_stock,
                        "low_stock_warning": p.current_stock <= 5,
                    }
                    for p in overview.top_selling_products[:5]
                ],
                "slow_moving_or_dead_stock": [
                    {
                        "name": p.product_name,
                        "brand": p.brand,
                        "current_stock": p.current_stock,
                        "inventory_value_vnd": p.inventory_value,
                        "days_in_stock": p.days_in_stock,
                        "units_sold_period": p.units_sold_period,
                        "aging_status": p.aging_status,
                    }
                    for p in overview.slow_moving_products[:5]
                ],
                "top_categories": [
                    {"name": c.category_name, "percentage": c.percentage}
                    for c in overview.category_interest[:4]
                ],
                "top_brands": [
                    {"brand": b.brand, "percentage": b.percentage}
                    for b in overview.brand_interest[:4]
                ],
                "top_search_queries": [
                    {"keyword": s.keyword, "count": s.search_count}
                    for s in overview.top_search_keywords[:5]
                ],
            }

            prompt = f"""Bạn là Giám đốc Chiến lược Thương mại Điện tử (E-Commerce Analytics Advisor) cấp cao của hệ thống XìMiStore.
Dưới đây là dữ liệu thực tế về hành vi người dùng, phễu chuyển đổi, sản phẩm bán chạy, sản phẩm bỏ giỏ và hàng tồn kho chậm luân chuyển của cửa hàng:

{json.dumps(data_summary, ensure_ascii=False, indent=2)}

Hãy phân tích sâu sắc các con số trên và trả về kết quả JSON chuẩn xác với đúng 4 trường sau bằng tiếng Việt:
1. "executive_summary": Tóm tắt tổng quan về bức tranh kinh doanh, doanh số và tỷ lệ chuyển đổi hiện tại (2-3 câu ngắn gọn, súc tích).
2. "dropoff_analysis": Phân tích nguyên nhân tại sao các sản phẩm top đầu lại bị bỏ giỏ nhiều mà chưa chốt đơn (tâm lý giá, đối thủ, thiếu khuyến mãi...).
3. "trend_insights": Nhận định xu hướng danh mục, thương hiệu và từ khóa khách hàng đang quan tâm nhiều nhất.
4. "actionable_recommendations": Mảng gồm 3-4 khuyến nghị hành động cụ thể, khả thi để Quản trị viên kích cầu, bao gồm:
   - Cảnh báo bổ sung hàng cho Best Sellers nếu số lượng tồn kho còn ít (<= 5).
   - Đề xuất giải pháp xả hàng tồn kho / Dead Stock đang chôn vốn lớn (giảm giá Flash Sale, bán combo kèm phụ kiện bán chạy).
   - Kích cầu cho sản phẩm bị bỏ giỏ nhiều hoặc ghim sản phẩm danh mục hot lên trang chủ.

YÊU CẦU QUAN TRỌNG: Chỉ trả về duy nhất chuỗi JSON hợp lệ, không kèm thêm bất kỳ lời giải thích nào bên ngoài.
"""

            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}],
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.3,
                },
            }

            # Tự động lấy danh sách candidate models khả dụng từ Google API
            candidate_models = _get_available_gemini_models(api_key)[:5]

            res_json = None
            selected_model = candidate_models[0]
            last_error_msg = ""

            with httpx.Client(timeout=30.0) as client:
                for m_name in candidate_models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={api_key}"
                    try:
                        resp = client.post(url, json=payload)
                        if resp.status_code == 429:
                            err_msg = ""
                            try:
                                err_msg = resp.json().get("error", {}).get("message", "")
                            except Exception:
                                err_msg = resp.text[:200]
                            logger.warning(
                                "Gemini model '%s' chạm giới hạn HTTP 429 (Too Many Requests / Quota): %s. Tự động xoay sang model dự phòng...",
                                m_name,
                                err_msg or "Rate limit reached",
                            )
                            last_error_msg = f"HTTP 429 ({m_name}): {err_msg}"
                            continue

                        if resp.status_code == 404:
                            logger.warning("Gemini model '%s' không tồn tại (HTTP 404). Thử model dự phòng...", m_name)
                            last_error_msg = f"HTTP 404 ({m_name})"
                            continue

                        if resp.status_code in [500, 502, 503, 504]:
                            logger.warning(
                                "Gemini model '%s' gặp lỗi dịch vụ Google (HTTP %s). Thử model tiếp theo...",
                                m_name,
                                resp.status_code,
                            )
                            last_error_msg = f"HTTP {resp.status_code} ({m_name})"
                            continue

                        resp.raise_for_status()
                        res_json = resp.json()
                        selected_model = m_name
                        break
                    except httpx.HTTPStatusError as http_err:
                        status = http_err.response.status_code
                        last_error_msg = f"HTTP {status} ({m_name})"
                        logger.warning("Gemini model '%s' gặp lỗi HTTP %s. Thử model tiếp theo...", m_name, status)
                        continue
                    except Exception as exc:
                        last_error_msg = f"{m_name}: {exc}"
                        logger.warning("Không thể kết nối Gemini model '%s': %s", m_name, exc)
                        continue

            if not res_json or "candidates" not in res_json or not res_json["candidates"]:
                logger.warning(
                    "Không có model Gemini nào phản hồi thành công (%s). Tự động kích hoạt Rule-based Fallback.",
                    last_error_msg or "All models failed",
                )
                fallback_res = rule_based_fallback(overview)
                set_cached_insights(overview, fallback_res)
                return fallback_res

            raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()

            # Clean markdown code fences if present
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            parsed = json.loads(raw_text)

            insights_res = GeminiInsightsResponse(
                source="gemini_ai",
                model=selected_model,
                executive_summary=parsed.get("executive_summary", ""),
                dropoff_analysis=parsed.get("dropoff_analysis", ""),
                trend_insights=parsed.get("trend_insights", ""),
                actionable_recommendations=parsed.get("actionable_recommendations", []),
                generated_at=datetime.now(timezone.utc),
            )
            set_cached_insights(overview, insights_res)
            return insights_res

        except Exception as exc:
            logger.warning("Không thể tạo Gemini Insights (%s). Kích hoạt Rule-based Fallback.", exc)
            fallback_res = rule_based_fallback(overview)
            set_cached_insights(overview, fallback_res)
            return fallback_res


def rule_based_chat_fallback(
    grounding_context: Dict[str, Any], question: str
) -> AdminAIChatResponse:
    """Tự động phân tích câu hỏi của quản trị viên và trích xuất dữ liệu trực tiếp từ MySQL khi không có kết nối Gemini API."""
    q_lower = question.lower()
    rev_data = grounding_context["revenue_and_orders"]
    funnel = grounding_context["conversion_funnel"]
    top_sellers = grounding_context["top_selling_products"]
    dropoffs = grounding_context["high_dropoff_products"]
    dead_stocks = grounding_context["slow_moving_and_dead_stock"]
    dyn = grounding_context.get("dynamic_retrieval", {})
    matched_prods = dyn.get("matched_products", [])
    data_sources = grounding_context["metadata"]["data_sources_used"]

    # 1. Nếu câu hỏi nhắc tới sản phẩm cụ thể (đã được chấm điểm chính xác trong matched_products)
    if matched_prods:
        target = matched_prods[0]
        specs_str = ", ".join([f"{k}: {v}" for k, v in list(target.get("specifications", {}).items())[:4]])
        sale_str = f" (Giá khuyến mãi: **{target['sale_price']:,.0f} ₫**)" if target.get("sale_price") else ""

        answer = (
            f"### 🔍 Thông Tin Chi Tiết: {target['name']}\n\n"
            f"- **Mã SKU:** `{target.get('sku')}` — **Thương hiệu:** {target.get('brand')} — **Danh mục:** {target.get('category')}\n"
            f"- **Giá niêm yết:** **{target['price']:,.0f} ₫**{sale_str}\n"
            f"- **Tồn kho hiện tại:** **{target.get('stock', 0)} chiếc**\n"
            f"- **Thông số nổi bật:** {specs_str if specs_str else 'Đã cập nhật theo cấu hình chuẩn'}\n\n"
            f"> *Đánh giá hiệu quả:* Sản phẩm đang nằm trong hệ thống kinh doanh của XìMiStore. Tồn kho ở mức {'an toàn' if target.get('stock', 0) > 5 else 'cần bổ sung'}."
        )
        followups = [
            f"Sản phẩm {target['name']} có đơn hàng nào gần đây không?",
            "So sánh giá bán và tồn kho của sản phẩm này với các mẫu cùng thương hiệu?",
            "Top sản phẩm bán chạy nhất hiện tại là gì?",
        ]

    # 2. Câu hỏi về Doanh thu / Đơn hàng / Hủy đơn
    elif any(k in q_lower for k in ["doanh thu", "tiền", "thực thu", "đơn hàng", "don hang", "hủy", "huy", "order", "thanh toán"]):
        delivered_rev = rev_data["delivered_revenue"]
        valid_rev = rev_data["total_valid_order_revenue"]
        counts = rev_data["order_status_counts"]
        cancel_rate = rev_data["cancelled_rate_pct"]
        total_orders = rev_data["total_orders_in_period"]

        status_breakdown = ", ".join([f"**{st}**: {cnt} đơn" for st, cnt in counts.items()]) if counts else "Chưa có đơn hàng"

        answer = (
            f"### 📊 Báo Cáo Doanh Thu & Đơn Hàng ({grounding_context['metadata']['days']} ngày qua)\n\n"
            f"- **Doanh thu thực nhận (Đơn hoàn tất `DELIVERED`):** **{delivered_rev:,.0f} ₫**\n"
            f"- **Tổng giá trị đơn hợp lệ (Chưa hủy):** **{valid_rev:,.0f} ₫**\n"
            f"- **Tổng số lượng đơn phát sinh:** **{total_orders} đơn**\n"
            f"- **Tỷ lệ hủy đơn:** **{cancel_rate}%** ({counts.get('CANCELLED', 0)} đơn bị hủy)\n\n"
            f"**Phân bổ trạng thái đơn hàng:** {status_breakdown}.\n\n"
            f"> *Gợi ý quản trị:* Doanh thu các đơn chưa hủy ({valid_rev:,.0f} ₫) bao gồm cả những đơn đang xử lý hoặc đang giao. Đội ngũ kho cần ưu tiên đóng gói và vận chuyển các đơn `CONFIRMED` để sớm chuyển thành doanh thu thực thu."
        )
        followups = [
            "Top 5 sản phẩm đóng góp nhiều doanh thu nhất hiện nay là gì?",
            "Sản phẩm nào đang bị khách bỏ giỏ nhiều nhất chưa tạo đơn?",
            "Tỷ lệ chuyển đổi tổng thể từ xem sản phẩm sang đặt hàng ra sao?",
        ]

    # 3. Câu hỏi về Bán chạy / Cháy hàng / Tồn kho thấp
    elif any(k in q_lower for k in ["bán chạy", "ban chay", "best seller", "cháy hàng", "chay hang", "hết hàng", "het hang", "sắp hết"]):
        low_stock_sellers = [p for p in top_sellers if p["current_stock"] <= 5]
        top_sellers_lines = "\n".join([
            f"- **{p['name']}** ({p['brand']}): Đã bán **{p['units_sold']} chiếc** ({p['order_count']} đơn) — Doanh thu: **{p['gross_revenue']:,.0f} ₫** — Tồn kho: **{p['current_stock']} chiếc**"
            for p in top_sellers[:5]
        ]) if top_sellers else "Chưa có sản phẩm bán chạy trong kỳ."

        alert_text = ""
        if low_stock_sellers:
            alert_text = (
                f"\n\n⚠️ **Cảnh báo nguy cơ đứt hàng:** Mặt hàng **{low_stock_sellers[0]['name']}** hiện chỉ còn **{low_stock_sellers[0]['current_stock']} sản phẩm** trong kho! Cần liên hệ nhà phân phối nhập bổ sung ngay để duy trì đà doanh số."
            )

        answer = (
            f"### 🔥 Top Sản Phẩm Bán Chạy Nhất ({grounding_context['metadata']['days']} ngày qua)\n\n"
            f"{top_sellers_lines}"
            f"{alert_text}\n\n"
            f"> *Gợi ý quản trị:* Đây là các mặt hàng đầu tàu doanh thu của cửa hàng. Bạn nên cân nhắc ghim các phụ kiện đi kèm để tăng giá trị trung bình trên mỗi đơn hàng (AOV)."
        )
        followups = [
            "Có mặt hàng nào đang tồn kho lâu ngày cần giải phóng vốn không?",
            "Tỷ lệ bỏ giỏ của các dòng sản phẩm cao cấp hiện nay thế nào?",
            "Doanh thu tổng thể của cửa hàng hiện tại là bao nhiêu?",
        ]

    # 4. Câu hỏi về Tồn kho lâu ngày / Dead stock / Đọng vốn / Chậm luân chuyển
    elif any(k in q_lower for k in ["tồn kho", "ton kho", "đọng vốn", "dong von", "dead stock", "chậm bán", "cham ban", "xả hàng", "xa hang", "giam vốn"]):
        total_dead_val = sum(p["inventory_value"] for p in dead_stocks)
        dead_lines = "\n".join([
            f"- **{p['name']}** ({p['brand']}): Tồn **{p['current_stock']} chiếc** — Vốn đọng: **{p['inventory_value']:,.0f} ₫** — Đã nằm kho: **{p['days_in_stock']} ngày** (Trạng thái: `{p['aging_status']}`)"
            for p in dead_stocks[:5]
        ]) if dead_stocks else "Hiện kho hàng duy trì tốc độ luân chuyển tốt, chưa phát hiện hàng chết."

        answer = (
            f"### 📦 Phân Tích Hàng Tồn Kho Đọng Vốn & Dead Stock\n\n"
            f"Hiện tại cửa hàng đang có khoảng **{len(dead_stocks)} mặt hàng** thuộc diện tồn lâu ngày / chậm bán, tổng vốn đọng ước tính lên đến **{total_dead_val:,.0f} ₫**:\n\n"
            f"{dead_lines}\n\n"
            f"> *Chiến lược giải phóng dòng tiền:* Quản trị viên nên tạo ngay chương trình **Flash Sale giảm giá 10-15%** cho các mẫu trên hoặc **tạo combo quà tặng kèm** khi khách mua laptop/phụ kiện bán chạy để xả kho nhanh."
        )
        followups = [
            "Mức giảm giá đề xuất cho mặt hàng tồn nhiều nhất là bao nhiêu?",
            "Top sản phẩm bán chạy nhất hiện tại để ghép combo là gì?",
            "Từ khóa nào đang được người dùng tìm kiếm nhiều nhất trên trang?",
        ]

    # 5. Câu hỏi về Bỏ giỏ / Dropoff / Phễu chuyển đổi
    elif any(k in q_lower for k in ["bỏ giỏ", "bo gio", "dropoff", "phễu", "pheu", "chuyển đổi", "chuyen doi", "conversion", "không mua"]):
        dropoff_lines = "\n".join([
            f"- **{p['name']}** ({p['brand']}): Giá **{p['price']:,.0f} ₫** — Xem: **{p['views']}** — Thêm giỏ: **{p['cart_adds']}** — Đã bán: **{p['units_sold']}** (Tỷ lệ bỏ giỏ: **{p['dropoff_rate_pct']}%**)"
            for p in dropoffs[:5]
        ]) if dropoffs else "Tỷ lệ giỏ hàng hiện tại duy trì ổn định."

        answer = (
            f"### ⚠️ Sản Phẩm Tỷ Lệ Bỏ Giỏ Cao & Phễu Chuyển Đổi\n\n"
            f"Trong {grounding_context['metadata']['days']} ngày qua, toàn sàn ghi nhận:\n"
            f"- **Lượt xem sản phẩm:** **{funnel['total_views']:,} lượt**\n"
            f"- **Lượt thêm vào giỏ:** **{funnel['total_cart_adds']:,} lượt** (Chuyển đổi xem ➔ giỏ: **{funnel['view_to_cart_pct']}%**)\n"
            f"- **Lượt đặt hàng:** **{funnel['total_orders']:,} đơn** (Chuyển đổi giỏ ➔ đơn: **{funnel['cart_to_order_pct']}%**)\n\n"
            f"**Top mặt hàng quan tâm cao nhưng bị bỏ giỏ nhiều nhất:**\n"
            f"{dropoff_lines}\n\n"
            f"> *Giải pháp:* Khách hàng chủ yếu phân vân ở bước thanh toán do mức giá cao. Nên thiết lập **mã giảm giá chớp nhoáng 3-5%** hoặc kích hoạt email nhắc nhở giỏ hàng bị bỏ quên sau 2 giờ."
        )
        followups = [
            "Sản phẩm nào đang bán chạy nhất và tỷ lệ chuyển đổi cao?",
            "Những từ khóa tìm kiếm nào đang có xu hướng tăng đột biến?",
            "Tình hình doanh thu thực tế hiện nay đạt bao nhiêu?",
        ]

    # 6. Mặc định: Báo cáo Tóm tắt Điều hành Cửa hàng
    else:
        top_prod_name = top_sellers[0]['name'] if top_sellers else "Thiết bị công nghệ"
        answer = (
            f"### 🤖 Báo Cáo Điều Hành XìMiStore ({grounding_context['metadata']['days']} ngày qua)\n\n"
            f"- **Doanh thu thực nhận (đã giao):** **{rev_data['delivered_revenue']:,.0f} ₫**\n"
            f"- **Tổng giá trị đơn hợp lệ:** **{rev_data['total_valid_order_revenue']:,.0f} ₫** ({rev_data['total_orders_in_period']} đơn)\n"
            f"- **Tỷ lệ chuyển đổi tổng thể:** **{funnel['overall_conversion_pct']}%** (Từ xem {funnel['total_views']:,} ➔ Đơn {funnel['total_orders']})\n"
            f"- **Mặt hàng chủ lực bán chạy:** **{top_prod_name}** ({top_sellers[0]['units_sold'] if top_sellers else 0} chiếc)\n"
            f"- **Hàng tồn kho cần chú ý:** Có **{len(dead_stocks)} mặt hàng** đang lưu kho trên 30 ngày chưa phát sinh đơn mới.\n\n"
            f"> *Bạn có thể hỏi tôi bất kỳ câu hỏi chi tiết nào về doanh thu, tồn kho của sản phẩm cụ thể, tỷ lệ bỏ giỏ hoặc giải pháp thúc đẩy bán hàng!*"
        )
        followups = [
            "Top sản phẩm bán chạy nào đang có nguy cơ đứt hàng?",
            "Những mặt hàng nào đang chôn vốn nhiều nhất cần xả kho?",
            "Tại sao các mẫu flagship có lượt xem cao nhưng ít đơn chốt?",
        ]

    return AdminAIChatResponse(
        answer=answer,
        suggested_followups=followups,
        data_sources_used=data_sources,
        source="rule_based_fallback",
        generated_at=datetime.now(timezone.utc),
    )


def chat_with_store_advisor(
    db: Session, request: AdminAIChatRequest
) -> AdminAIChatResponse:
    """Xử lý hội thoại đa lượt với Gemini Store Copilot có đối chiếu dữ liệu MySQL thực tế (với Multi-Model Fallback)."""
    grounding_context = build_store_grounding_context(
        db=db, days=request.days, user_question=request.question
    )
    data_sources = grounding_context["metadata"]["data_sources_used"]
    api_key = settings.GEMINI_API_KEY.strip()

    if not api_key:
        logger.info("Chưa cấu hình GEMINI_API_KEY. Sử dụng Rule-based Smart Chat Fallback.")
        return rule_based_chat_fallback(grounding_context, request.question)

    try:
        system_instruction_text = f"""Bạn là Ximi AI - Cố vấn Chiến lược & Quản lý Cửa hàng Cấp cao của hệ thống XìMiStore.
Nhiệm vụ của bạn là hỗ trợ Quản trị viên (Admin/Staff) giải đáp thắc mắc, phân tích kinh doanh, tồn kho, doanh thu và phễu chuyển đổi dựa trên DỮ LIỆU THỰC TẾ ĐƯỢC TRÍCH XUẤT TỪ CƠ SỞ DỮ LIỆU MYSQL sau đây:

=== STORE GROUNDING DATA (THỜI KỲ {grounding_context['metadata']['days']} NGÀY GẦN NHẤT) ===
{json.dumps(grounding_context, ensure_ascii=False, indent=1)}

=== QUY TẮC BẮT BUỘC ===
1. TRUNG THỰC VÀ CHÍNH XÁC: Luôn trích dẫn chính xác con số cụ thể từ dữ liệu trên (số lượng máy, đơn giá VNĐ định dạng rõ ràng ví dụ 15.000.000 ₫, tỷ lệ %, mã SKU, tên danh mục). Tuyệt đối không tự bịa đặt bất kỳ thông tin hoặc con số nào ngoài hệ thống.
   - Khi người dùng hỏi về một sản phẩm cụ thể, LUÔN LUÔN ghi rõ tên đầy đủ kèm mã SKU trong câu trả lời (ví dụ: '**iPhone 16 Pro Max 256GB Titan Sa Mạc** (mã SKU: `PHN-AP-IP16PM-256`)') cùng giá niêm yết/khuyến mãi và số lượng tồn kho.
2. NẮM RÕ HAI CHỈ SỐ DOANH THU:
   - 'delivered_revenue': Tổng tiền các đơn đã giao thành công (thực thu).
   - 'total_valid_order_revenue': Tổng tiền các đơn hợp lệ không bị hủy (bao gồm cả đơn đang xác nhận/đang giao).
   Nếu người dùng hỏi chung về 'doanh thu', hãy nêu cả hai chỉ số để làm rõ bức tranh tài chính.
3. PHÂN TÍCH CHUYÊN NGHIỆP: Không chỉ liệt kê số liệu khô khan, hãy phân tích ý nghĩa kinh doanh, nguyên nhân và đưa ra lời khuyên hành động thiết thực.
4. ĐỊNH DẠNG TRẢ VỀ: Trả về chuỗi JSON chuẩn xác gồm đúng 2 trường:
   - "answer": Câu trả lời định dạng Markdown chuyên nghiệp (dùng ### cho tiêu đề con, danh sách gạch đầu dòng, in đậm tên sản phẩm và tiền tệ).
   - "suggested_followups": Mảng gồm đúng 3 câu hỏi gợi ý tiếp theo ngắn gọn, hữu ích để admin đào sâu vấn đề.
"""

        # Chuyển đổi lịch sử chat: bắt buộc map assistant -> model
        contents = []
        for msg in request.history[-6:]:
            gemini_role = "model" if msg.role == "assistant" else "user"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": msg.content}]
            })

        # Thêm câu hỏi hiện tại của user
        contents.append({
            "role": "user",
            "parts": [{"text": request.question}]
        })

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_instruction_text}]
            },
            "contents": contents,
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
            },
        }

        # Tự động lấy danh sách candidate models khả dụng từ Google API
        candidate_models = _get_available_gemini_models(api_key)[:5]

        res_json = None
        selected_model = candidate_models[0]
        last_error_msg = ""

        with httpx.Client(timeout=35.0) as client:
            for m_name in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={api_key}"
                try:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 429:
                        err_msg = ""
                        try:
                            err_msg = resp.json().get("error", {}).get("message", "")
                        except Exception:
                            err_msg = resp.text[:200]
                        logger.warning(
                            "Gemini Copilot model '%s' chạm giới hạn HTTP 429 (Too Many Requests / Quota): %s. Tự động xoay sang model dự phòng...",
                            m_name,
                            err_msg or "Rate limit reached",
                        )
                        last_error_msg = f"HTTP 429 ({m_name}): {err_msg}"
                        continue

                    if resp.status_code == 404:
                        logger.warning("Gemini Copilot model '%s' không tồn tại (HTTP 404). Thử model dự phòng...", m_name)
                        last_error_msg = f"HTTP 404 ({m_name})"
                        continue

                    if resp.status_code in [500, 502, 503, 504]:
                        logger.warning(
                            "Gemini Copilot model '%s' gặp lỗi dịch vụ Google (HTTP %s). Thử model tiếp theo...",
                            m_name,
                            resp.status_code,
                        )
                        last_error_msg = f"HTTP {resp.status_code} ({m_name})"
                        continue

                    resp.raise_for_status()
                    res_json = resp.json()
                    selected_model = m_name
                    break
                except httpx.HTTPStatusError as http_err:
                    status = http_err.response.status_code
                    last_error_msg = f"HTTP {status} ({m_name})"
                    logger.warning("Gemini Copilot model '%s' gặp lỗi HTTP %s. Thử model tiếp theo...", m_name, status)
                    continue
                except Exception as exc:
                    last_error_msg = f"{m_name}: {exc}"
                    logger.warning("Không thể kết nối Gemini Copilot model '%s': %s", m_name, exc)
                    continue

        if not res_json or "candidates" not in res_json or not res_json["candidates"]:
            logger.warning(
                "Không có model Gemini nào phản hồi thành công (%s). Tự động kích hoạt Rule-based Chat Fallback.",
                last_error_msg or "All candidate models failed",
            )
            return rule_based_chat_fallback(grounding_context, request.question)

        raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed = json.loads(raw_text)

        return AdminAIChatResponse(
            answer=parsed.get("answer", ""),
            suggested_followups=parsed.get("suggested_followups", []),
            data_sources_used=data_sources,
            source="gemini_ai",
            generated_at=datetime.now(timezone.utc),
        )

    except Exception as exc:
        logger.warning(
            "Không thể xử lý Gemini Chat API (%s). Tự động kích hoạt Rule-based Chat Fallback.",
            exc,
        )
        return rule_based_chat_fallback(grounding_context, request.question)

