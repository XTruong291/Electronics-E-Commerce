from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserEventCreate(BaseModel):
    event_type: str = Field(..., max_length=50, description="Loại sự kiện (PRODUCT_VIEW, ADD_TO_CART, REMOVE_FROM_CART, SEARCH, CATEGORY_VIEW)")
    session_id: str = Field(..., max_length=64, description="Định danh phiên duyệt web")
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    search_query: Optional[str] = Field(None, max_length=255)
    metadata_json: Optional[Dict[str, Any]] = None


class UserEventResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    session_id: str
    event_type: str
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    search_query: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversionFunnelSummary(BaseModel):
    total_views: int = 0
    total_cart_adds: int = 0
    total_orders: int = 0
    view_to_cart_pct: float = 0.0
    cart_to_order_pct: float = 0.0
    overall_conversion_pct: float = 0.0


class HighDropoffProductItem(BaseModel):
    product_id: int
    product_name: str
    thumbnail_url: Optional[str] = None
    category_name: str = "Chung"
    brand: str = "Khác"
    price: int = 0
    sale_price: Optional[int] = None
    views: int = 0
    cart_adds: int = 0
    units_sold: int = 0
    dropoff_rate_pct: float = 0.0
    status_flag: str = "HEALTHY"  # HIGH_DROPOFF | CONSIDERING | HEALTHY


class TopSellingProductItem(BaseModel):
    product_id: int
    product_name: str
    sku: str
    thumbnail_url: Optional[str] = None
    category_name: str = "Chung"
    brand: str = "Khác"
    price: int = 0
    sale_price: Optional[int] = None
    units_sold: int = 0
    order_count: int = 0
    gross_revenue: int = 0
    current_stock: int = 0


class SlowMovingProductItem(BaseModel):
    product_id: int
    product_name: str
    sku: str
    thumbnail_url: Optional[str] = None
    category_name: str = "Chung"
    brand: str = "Khác"
    price: int = 0
    sale_price: Optional[int] = None
    current_stock: int = 0
    inventory_value: int = 0
    units_sold_period: int = 0
    views_period: int = 0
    days_in_stock: int = 0
    aging_status: str = "SLOW_MOVING"  # DEAD_STOCK | SLOW_MOVING


class CategoryInterestItem(BaseModel):
    category_id: int
    category_name: str
    total_interactions: int
    percentage: float


class BrandInterestItem(BaseModel):
    brand: str
    total_interactions: int
    percentage: float


class SearchKeywordItem(BaseModel):
    keyword: str
    search_count: int


class AnalyticsOverviewResponse(BaseModel):
    days: int
    funnel: ConversionFunnelSummary
    high_dropoff_products: List[HighDropoffProductItem]
    top_selling_products: List[TopSellingProductItem] = []
    slow_moving_products: List[SlowMovingProductItem] = []
    category_interest: List[CategoryInterestItem]
    brand_interest: List[BrandInterestItem]
    top_search_keywords: List[SearchKeywordItem]
    total_events_recorded: int


class GeminiInsightsResponse(BaseModel):
    source: str = "gemini_ai"  # gemini_ai | rule_based_fallback
    model: str = "gemini-2.5-flash"
    executive_summary: str
    dropoff_analysis: str
    trend_insights: str
    actionable_recommendations: List[str]
    generated_at: datetime


class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AdminAIChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    days: int = Field(30, ge=1, le=90)
    history: List[ChatMessageItem] = []


class AdminAIChatResponse(BaseModel):
    answer: str
    suggested_followups: List[str] = []
    data_sources_used: List[str] = []
    source: str = "gemini_ai"  # gemini_ai | rule_based_fallback
    generated_at: datetime

