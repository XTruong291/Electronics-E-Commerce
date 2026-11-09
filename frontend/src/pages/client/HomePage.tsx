import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Button,
  Select,
  Pagination,
  Spin,
  Empty,
  Carousel,
  Tooltip,
} from "antd";
import type { CarouselRef } from "antd/es/carousel";
import {
  ShoppingCartOutlined,
  FireFilled,
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
  ThunderboltFilled,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../../api/catalog.api";
import { getArticles } from "../../api/article.api";
import { useCartStore } from "../../store/useCartStore";
import { useResponsive } from "../../hooks/useResponsive";
import type { Category, Product } from "../../types/catalog";
import type { Article } from "../../types/article";

const { Title, Text, Paragraph } = Typography;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

// Các từ khóa thông số kỹ thuật không cần hiển thị trên micro-pills của Card
const IGNORED_SPEC_KEYS = [
  "bảo hành",
  "bao hanh",
  "mô tả",
  "mo ta",
  "hộp",
  "hop",
  "phụ kiện",
  "phu kien",
  "xuất xứ",
  "xuat xu",
  "năm ra mắt",
  "nam ra mat",
];

// Helper lọc & rút gọn thông minh tối đa 2-3 thông số ngắn gọn (<= 26 ký tự)
const getCardMicroSpecs = (specifications?: Record<string, any>): string[] => {
  if (!specifications || typeof specifications !== "object") return [];
  const list: string[] = [];

  for (const [key, rawVal] of Object.entries(specifications)) {
    if (!rawVal) continue;
    const cleanKey = key.trim().toLowerCase();
    if (IGNORED_SPEC_KEYS.some((k) => cleanKey.includes(k))) continue;

    let val = String(rawVal).trim();
    if (!val) continue;

    // Rút gọn mệnh đề trước dấu ngoặc đơn nếu có (ví dụ số nhân/luồng hoặc độ phân giải)
    const parenIdx = val.indexOf("(");
    if (parenIdx >= 4) {
      val = val.substring(0, parenIdx).trim();
    }

    // Rút gọn mệnh đề trước dấu phẩy nếu chuỗi quá dài (> 26 ký tự)
    const commaIdx = val.indexOf(",");
    if (commaIdx >= 4 && val.length > 26) {
      val = val.substring(0, commaIdx).trim();
    }

    // Chuẩn hóa câu chữ mô tả dài ở các dòng phụ kiện/tai nghe
    val = val
      .replace(/^Driver dynamic do Apple thiết kế.*/i, "Driver Apple Dynamic")
      .replace(/^2 chip Apple H1 riêng biệt.*/i, "Chip Apple H1 (x2)")
      .replace(/thế hệ mới/i, "")
      .trim();

    // Khống chế độ dài tối đa 26 ký tự kèm dấu '...'
    if (val.length > 26) {
      val = val.slice(0, 23).trim() + "...";
    }

    list.push(val);
  }

  // Lấy tối đa 2-3 thông số đẹp mắt nhất
  return list.slice(0, 3);
};

export interface HeroBannerItem {
  id: number;
  image: string;
  fallbackImage: string;
  tag?: string;
  tagColor?: string;
  subtitle?: string;
  title?: string;
  description?: string;
  ctaText?: string;
  hideTextOverlay?: boolean;
}

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: 1,
    image: "/banners/banner-1.jpg",
    fallbackImage: "https://athgroup.vn/upload/blocks/thumb_1920x0/blocks-0-1690355547-1690355547.jpg",
    tag: "XÌMISTORE FLAGSHIP",
    tagColor: "#cb1c22",
    subtitle: "Cam kết 100% Chính hãng VN/A • Đổi mới trong 30 ngày",
    title: "Hệ Thống Bán Lẻ Thiết Bị Công Nghệ",
    description: "Trải nghiệm Laptop, Smartphone và Phụ kiện cao cấp với chính sách bảo hành chính hãng toàn diện, hỗ trợ trả góp 0% lãi suất.",
    ctaText: "Khám phá ngay",
    hideTextOverlay: false,
  },
  {
    id: 2,
    image: "/banners/banner-2.jpg",
    fallbackImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80",
    tag: "ĐẶC QUYỀN MUA SẮM",
    tagColor: "#cb1c22",
    subtitle: "Giao hàng hỏa tốc 2H • Miễn phí vận chuyển toàn quốc",
    title: "Ưu Đãi Độc Quyền",
    description: "Định giá máy cũ nhanh chóng qua hệ thống chuẩn xác, hỗ trợ chuyển đổi dữ liệu và trợ giá trực tiếp khi nâng cấp thiết bị mới.",
    ctaText: "Xem sản phẩm",
    hideTextOverlay: false,
  },
  {
    id: 3,
    image: "/banners/banner-4.jpg",
    fallbackImage: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1600&auto=format&fit=crop&q=80",
    tag: "DỊCH VỤ",
    tagColor: "#cb1c22",
    subtitle: "Hỗ trợ kỹ thuật 24/7",
    title: "An Tâm Tuyệt Đối Với Chế Độ Hậu Mãi Chu Đáo",
    description: "Đội ngũ chuyên viên kỹ thuật chuyên nghiệp luôn sẵn sàng hỗ trợ khách hàng từ bảo dưỡng định kỳ đến xử lý sự cố từ xa.",
    ctaText: "Mua sắm ngay",
    hideTextOverlay: false,
  },
];

const HomePage: React.FC = () => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);
  const carouselRef = useRef<CarouselRef>(null);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [failedBanners, setFailedBanners] = useState<Record<number, boolean>>({});

  // Filter states from URL & local controls
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || undefined;

  const [categorySlug, setCategorySlug] = useState<string | undefined>(initialCategory);
  const [searchKeyword, setSearchKeyword] = useState<string>(initialSearch);
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Cập nhật khi searchParams thay đổi từ Header & Sub-header
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlCategory = searchParams.get("category") || undefined;
    setSearchKeyword(urlSearch);
    setCategorySlug(urlCategory);
    setPage(1);
  }, [searchParams]);

  // Tải danh mục khi mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const list = await getCategories(false);
        setCategories(list);
      } catch (err) {
        console.error("Lỗi tải danh mục:", err);
      }
    };
    fetchCats();
  }, []);

  // Tải danh sách sản phẩm
  const fetchProductList = useCallback(async () => {
    setLoading(true);
    try {
      let min_price: number | undefined = undefined;
      let max_price: number | undefined = undefined;

      if (priceRange === "under-10m") {
        max_price = 10000000;
      } else if (priceRange === "10m-20m") {
        min_price = 10000000;
        max_price = 20000000;
      } else if (priceRange === "20m-35m") {
        min_price = 20000000;
        max_price = 35000000;
      } else if (priceRange === "above-35m") {
        min_price = 35000000;
      }

      const res = await getProducts({
        category_slug: categorySlug,
        search: searchKeyword || undefined,
        brand: selectedBrand || undefined,
        min_price,
        max_price,
        sort_by: sortBy,
        page,
        page_size: pageSize,
      });

      setProducts(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, searchKeyword, selectedBrand, priceRange, sortBy, page, pageSize]);

  useEffect(() => {
    fetchProductList();
  }, [fetchProductList]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await getArticles({ page: 1, page_size: 4 });
        setLatestArticles(res.items);
      } catch (err) {
        console.error("Lỗi tải bài viết trang chủ:", err);
      }
    };
    fetchArticles();
  }, []);

  // Danh sách thương hiệu khớp chuẩn 100% với các sản phẩm trong DB
  const popularBrands = [
    "Apple",
    "Dell",
    "ASUS",
    "Lenovo",
    "Samsung",
    "Xiaomi",
    "OPPO",
    "LG",
    "Logitech",
    "Keychron",
    "Razer",
    "Sony",
    "Marshall",
  ];

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addItem(product, 1);
  };

  // Reset bộ lọc: xóa state tại chỗ và xóa sạch URL search params
  const handleResetFilters = () => {
    setCategorySlug(undefined);
    setSearchKeyword("");
    setSelectedBrand(undefined);
    setPriceRange("all");
    setSortBy("created_at_desc");
    setPage(1);
    setSearchParams({});
  };

  // Cuộn mượt tới danh sách sản phẩm
  const scrollToProducts = () => {
    document.getElementById("product-catalog-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Tìm tên hiển thị danh mục hiện tại nếu có
  const currentCategoryName = categories.find((c) => c.slug === categorySlug)?.name || categorySlug;

  const isFiltered = Boolean(
    categorySlug ||
    searchKeyword ||
    selectedBrand ||
    priceRange !== "all" ||
    sortBy !== "created_at_desc"
  );

  const handleRemoveCategory = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    setSearchParams(params);
  };

  const handleRemoveSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    setSearchParams(params);
  };

  return (
    <div>
      {/* 1. HERO BANNER: FULL-WIDTH CAROUSEL VỚI KHẢ NĂNG LƯỚT / VUỐT QUA LẠI VÀ NÚT ĐIỀU HƯỚNG */}
      <div style={{ marginBottom: isMobile ? 16 : 24, position: "relative" }}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            height: isMobile ? 210 : 320,
            background: "#0f172a",
            position: "relative",
          }}
        >
          {/* Nút lướt sang trái */}
          <button
            type="button"
            aria-label="Previous Slide"
            onClick={() => carouselRef.current?.prev()}
            style={{
              position: "absolute",
              left: isMobile ? 6 : 14,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: isMobile ? 30 : 38,
              height: isMobile ? 30 : 38,
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(203, 28, 34, 0.85)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(15, 23, 42, 0.65)")}
          >
            <LeftOutlined style={{ fontSize: isMobile ? 13 : 16 }} />
          </button>

          {/* Nút lướt sang phải */}
          <button
            type="button"
            aria-label="Next Slide"
            onClick={() => carouselRef.current?.next()}
            style={{
              position: "absolute",
              right: isMobile ? 6 : 14,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: isMobile ? 30 : 38,
              height: isMobile ? 30 : 38,
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(203, 28, 34, 0.85)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(15, 23, 42, 0.65)")}
          >
            <RightOutlined style={{ fontSize: isMobile ? 13 : 16 }} />
          </button>

          <Carousel
            ref={carouselRef}
            autoplay
            autoplaySpeed={4500}
            draggable
            swipeToSlide
            infinite
          >
            {HERO_BANNERS.map((banner) => {
              const bgUrl = failedBanners[banner.id] ? banner.fallbackImage : banner.image;
              return (
                <div key={banner.id}>
                  {/* Preloader for image errors */}
                  <img
                    src={banner.image}
                    alt=""
                    style={{ display: "none" }}
                    onError={() =>
                      setFailedBanners((prev) => ({ ...prev, [banner.id]: true }))
                    }
                  />
                  <div
                    style={{
                      height: isMobile ? 210 : 320,
                      backgroundImage: `url('${bgUrl}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                      userSelect: "none",
                    }}
                  >
                    {!banner.hideTextOverlay && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(90deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.5) 60%, rgba(15, 23, 42, 0.15) 100%)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          padding: isMobile ? "0 22px 0 38px" : "0 60px",
                          color: "#fff",
                        }}
                      >
                        {banner.tag && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 4 : 8 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "#cb1c22",
                                backgroundColor: "#cb1c22",
                                color: "#ffffff",
                                fontWeight: 800,
                                fontSize: isMobile ? 10 : 12,
                                padding: isMobile ? "2px 8px" : "4px 12px",
                                borderRadius: 9999,
                                letterSpacing: "0.5px",
                                boxShadow: "0 2px 8px rgba(203, 28, 34, 0.45)",
                              }}
                            >
                              <FireFilled style={{ color: "#ffffff", fontSize: isMobile ? 10 : 13 }} />
                              <span style={{ color: "#ffffff", fontWeight: 800 }}>{banner.tag}</span>
                            </span>
                            {!isMobile && banner.subtitle && (
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.92)" }}>
                                {banner.subtitle}
                              </span>
                            )}
                          </div>
                        )}
                        {banner.title && (
                          <Title
                            level={2}
                            style={{
                              color: "#fff",
                              margin: isMobile ? "0 0 6px" : "0 0 10px",
                              fontWeight: 800,
                              fontSize: isMobile ? 18 : 28,
                              lineHeight: 1.2,
                            }}
                          >
                            {banner.title}
                          </Title>
                        )}
                        {!isMobile && banner.description && (
                          <Paragraph style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, margin: "0 0 20px", maxWidth: 620 }}>
                            {banner.description}
                          </Paragraph>
                        )}
                        <div>
                          <Button
                            size={isMobile ? "middle" : "large"}
                            style={{
                              background: "#cb1c22",
                              color: "#fff",
                              fontWeight: 700,
                              borderRadius: 8,
                              border: "none",
                              height: isMobile ? 34 : 42,
                              padding: isMobile ? "0 16px" : "0 24px",
                              fontSize: isMobile ? 12 : 14,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                            onClick={() => scrollToProducts()}
                          >
                            {banner.ctaText || "Khám phá ngay"} <ArrowRightOutlined />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Carousel>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR: TINH GỌN, CHUẨN XÁC, ĐỒNG BỘ 100% VỚI HEADER */}
      <div id="product-catalog-section">
        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            marginBottom: 24,
            background: "#ffffff",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #e5e7eb",
          }}
          bodyStyle={{ padding: "16px 20px" }}
        >
          {/* Hàng 1: Brand Quick-Pills (Touch Scrollable on Mobile) */}
          <div style={{ marginBottom: 14 }}>
            <div
              className="horizontal-touch-scroll"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: isMobile ? "nowrap" : "wrap",
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginRight: 4, flexShrink: 0 }}>
                Hãng sản xuất:
              </span>
              <Button
                size="small"
                shape="round"
                type={selectedBrand === undefined ? "primary" : "default"}
                onClick={() => {
                  setSelectedBrand(undefined);
                  setPage(1);
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: selectedBrand === undefined ? "#cb1c22" : "#f3f4f6",
                  borderColor: selectedBrand === undefined ? "#cb1c22" : "transparent",
                  color: selectedBrand === undefined ? "#fff" : "#374151",
                  flexShrink: 0,
                }}
              >
                Tất cả
              </Button>
              {popularBrands.map((b) => {
                const isActive = selectedBrand?.toLowerCase() === b.toLowerCase();
                return (
                  <Button
                    key={b}
                    size="small"
                    shape="round"
                    type={isActive ? "primary" : "default"}
                    onClick={() => {
                      setSelectedBrand(isActive ? undefined : b);
                      setPage(1);
                    }}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      background: isActive ? "#cb1c22" : "#f3f4f6",
                      borderColor: isActive ? "#cb1c22" : "transparent",
                      color: isActive ? "#fff" : "#374151",
                      flexShrink: 0,
                    }}
                  >
                    {b}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Hàng 2: Bộ chọn Khoảng giá, Sắp xếp, Status chips & Nút xóa lọc */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              paddingTop: 12,
              borderTop: "1px solid #f3f4f6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Khoảng giá */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Mức giá:</span>
                <Select
                  style={{ width: 155 }}
                  value={priceRange}
                  onChange={(val) => {
                    setPriceRange(val);
                    setPage(1);
                  }}
                  options={[
                    { label: "Mọi mức giá", value: "all" },
                    { label: "Dưới 10 triệu", value: "under-10m" },
                    { label: "10 - 20 triệu", value: "10m-20m" },
                    { label: "20 - 35 triệu", value: "20m-35m" },
                    { label: "Trên 35 triệu", value: "above-35m" },
                  ]}
                />
              </div>

              {/* Sắp xếp */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Sắp xếp:</span>
                <Select
                  style={{ width: 165 }}
                  value={sortBy}
                  onChange={(val) => {
                    setSortBy(val);
                    setPage(1);
                  }}
                  options={[
                    { label: "Mới nhất", value: "created_at_desc" },
                    { label: "Giá tăng dần", value: "price_asc" },
                    { label: "Giá giảm dần", value: "price_desc" },
                    { label: "Tên sản phẩm A-Z", value: "name_asc" },
                  ]}
                />
              </div>

              {/* Active criteria tags */}
              {categorySlug && (
                <Tag
                  closable
                  onClose={handleRemoveCategory}
                  color="red"
                  style={{ borderRadius: 12, fontSize: 12, padding: "2px 8px" }}
                >
                  Danh mục: {currentCategoryName}
                </Tag>
              )}

              {searchKeyword && (
                <Tag
                  closable
                  onClose={handleRemoveSearch}
                  color="blue"
                  style={{ borderRadius: 12, fontSize: 12, padding: "2px 8px" }}
                >
                  Từ khóa: "{searchKeyword}"
                </Tag>
              )}

              <Text type="secondary" style={{ fontSize: 13 }}>
                Tìm thấy <strong style={{ color: "#111827" }}>{total}</strong> thiết bị
              </Text>
            </div>

            {/* Nút Xóa tất cả bộ lọc */}
            {isFiltered && (
              <Button
                type="link"
                danger
                onClick={handleResetFilters}
                style={{ padding: 0, fontWeight: 600, fontSize: 13 }}
              >
                Xóa tất cả bộ lọc
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* 3. PRODUCT CARDS GRID */}
      <Spin spinning={loading} tip="Đang tải danh sách thiết bị...">
        {products.length === 0 && !loading ? (
          <Empty
            description="Không tìm thấy thiết bị nào phù hợp với điều kiện lọc."
            style={{ padding: "64px 0", background: "#ffffff", borderRadius: 12 }}
          >
            <Button
              type="primary"
              onClick={handleResetFilters}
              style={{ background: "#cb1c22", borderColor: "#cb1c22" }}
            >
              Xem tất cả sản phẩm
            </Button>
          </Empty>
        ) : (
          <Row gutter={isMobile ? [10, 10] : [16, 16]}>
            {products.map((product) => {
              const hasDiscount =
                product.sale_price !== null &&
                product.sale_price !== undefined &&
                product.sale_price > 0 &&
                product.sale_price < product.price;

              const discountPercent = hasDiscount
                ? Math.round(((product.price - (product.sale_price || 0)) / product.price) * 100)
                : 0;

              const isOutOfStock = product.stock <= 0;

              // Rút trích 2-3 thông số kỹ thuật đặc trưng ngắn gọn (<= 26 ký tự)
              const microSpecs = getCardMicroSpecs(product.specifications);

              return (
                <Col xs={12} sm={8} md={6} lg={6} key={product.id}>
                  <div
                    className="product-card-hover"
                    onClick={() => navigate(`/products/${product.slug}`)}
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      background: "#ffffff",
                      borderRadius: isMobile ? 8 : 12,
                      border: "1px solid #e5e7eb",
                      padding: isMobile ? "8px 8px 10px" : 14,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ minWidth: 0, width: "100%", overflow: "hidden" }}>
                      {/* Top Badges Row: Giảm X% & Trả góp 0% */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: isMobile ? 4 : 8,
                          minHeight: 20,
                        }}
                      >
                        {hasDiscount ? (
                          <span
                            style={{
                              background: "#cb1c22",
                              color: "#fff",
                              fontSize: isMobile ? 10 : 11,
                              fontWeight: 700,
                              padding: isMobile ? "1px 5px" : "2px 8px",
                              borderRadius: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            Giảm {discountPercent}%
                          </span>
                        ) : (
                          <span />
                        )}

                        {(!isMobile || !hasDiscount) && (
                          <span
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              fontSize: isMobile ? 10 : 11,
                              fontWeight: 600,
                              padding: isMobile ? "1px 4px" : "1px 6px",
                              borderRadius: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            Trả góp 0%
                          </span>
                        )}
                      </div>

                      {/* Product Image Box */}
                      <div
                        style={{
                          height: isMobile ? 130 : 180,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginBottom: isMobile ? 6 : 12,
                          position: "relative",
                        }}
                      >
                        <img
                          className="product-card-img"
                          alt={product.name}
                          src={
                            product.thumbnail_url ||
                            "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=60"
                          }
                          style={{
                            maxHeight: "100%",
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />

                        {isOutOfStock && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(255,255,255,0.7)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Tag color="default" style={{ fontSize: isMobile ? 10 : 12, padding: "2px 6px", fontWeight: 600 }}>
                              Tạm hết
                            </Tag>
                          </div>
                        )}
                      </div>

                      {/* Brand Label */}
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                          {product.brand}
                        </span>
                      </div>

                      {/* Product Title (2-line clamp) */}
                      <Tooltip title={product.name}>
                        <div
                          style={{
                            fontSize: isMobile ? 12 : 14,
                            fontWeight: 600,
                            color: "#1f2937",
                            lineHeight: isMobile ? "17px" : "20px",
                            height: isMobile ? 34 : 40,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            marginBottom: isMobile ? 4 : 8,
                          }}
                        >
                          {product.name}
                        </div>
                      </Tooltip>

                      {/* Tech Specs Micro-Chips (Hidden on mobile to preserve equal card heights) */}
                      {!isMobile && microSpecs.length > 0 && (
                        <div
                          className="product-specs-container"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                            marginBottom: 12,
                            maxWidth: "100%",
                            overflow: "hidden",
                          }}
                        >
                          {microSpecs.map((spec, idx) => (
                            <span
                              key={idx}
                              title={spec}
                              className="product-spec-pill"
                              style={{
                                background: "#f3f4f6",
                                color: "#4b5563",
                                fontSize: 11,
                                padding: "2px 6px",
                                borderRadius: 4,
                                display: "inline-block",
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                verticalAlign: "bottom",
                                boxSizing: "border-box",
                              }}
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price Block & Action Button (Pushed to bottom) */}
                    <div style={{ marginTop: "auto", paddingTop: 6 }}>
                      <div
                        style={{
                          marginBottom: isMobile ? 6 : 10,
                          minHeight: isMobile ? 36 : 42,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                        }}
                      >
                        {hasDiscount ? (
                          <div>
                            <div style={{ color: "#cb1c22", fontWeight: 800, fontSize: isMobile ? 14 : 17, lineHeight: 1.2 }}>
                              {formatPrice(product.sale_price as number)}
                            </div>
                            <div style={{ color: "#9ca3af", textDecoration: "line-through", fontSize: isMobile ? 11 : 12, lineHeight: 1.2 }}>
                              {formatPrice(product.price)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: "#cb1c22", fontWeight: 800, fontSize: isMobile ? 14 : 17 }}>
                            {formatPrice(product.price)}
                          </div>
                        )}
                      </div>

                      <Button
                        block
                        type="primary"
                        icon={<ShoppingCartOutlined style={{ fontSize: isMobile ? 14 : 16 }} />}
                        disabled={isOutOfStock}
                        onClick={(e) => handleAddToCart(product, e)}
                        style={{
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: isMobile ? 12 : 13,
                          height: isMobile ? 32 : 36,
                          padding: isMobile ? "0 4px" : "0 15px",
                          background: isOutOfStock ? undefined : "#cb1c22",
                          borderColor: isOutOfStock ? undefined : "#cb1c22",
                        }}
                      >
                        {isOutOfStock ? "Hết hàng" : (isMobile ? "Thêm giỏ" : "Thêm vào giỏ")}
                      </Button>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* 4. PAGINATION */}
      {total > 0 && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={(newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
              window.scrollTo({ top: 400, behavior: "smooth" });
            }}
            showSizeChanger
            pageSizeOptions={["12", "24", "48"]}
          />
        </div>
      )}

      {/* 5. TECH NEWS & FUTURE TRENDS SECTION */}
      {latestArticles.length > 0 && (
        <div style={{ marginTop: 52 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#cb1c22",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 4,
                }}
              >
                <ThunderboltFilled /> XìMi Tech Insights
              </div>
              <Title
                level={3}
                style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}
              >
                Xu Hướng Công Nghệ & Thiết Bị Tương Lai
              </Title>
            </div>

            <Button
              type="link"
              onClick={() => navigate("/news")}
              style={{
                color: "#cb1c22",
                fontWeight: 600,
                padding: 0,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Xem tất cả bài viết <ArrowRightOutlined />
            </Button>
          </div>

          <Row gutter={[20, 20]}>
            {latestArticles.map((art) => (
              <Col xs={24} sm={12} lg={6} key={art.id}>
                <Card
                  hoverable
                  bordered={false}
                  onClick={() => navigate(`/news/${art.slug}`)}
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                  bodyStyle={{
                    padding: 16,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        borderRadius: 10,
                        overflow: "hidden",
                        marginBottom: 12,
                        aspectRatio: "16/9",
                        background: "#f3f4f6",
                      }}
                    >
                      <img
                        src={
                          art.thumbnail_url ||
                          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80"
                        }
                        alt={art.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.35s ease",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <Tag
                        color="blue"
                        style={{
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 11,
                          marginRight: 6,
                        }}
                      >
                        {art.topic}
                      </Tag>
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#111827",
                        lineHeight: 1.4,
                        marginBottom: 8,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {art.title}
                    </div>

                    <Paragraph
                      type="secondary"
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {art.summary}
                    </Paragraph>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    <span>{new Date(art.created_at).toLocaleDateString("vi-VN")}</span>
                    <span>
                      <EyeOutlined style={{ marginRight: 4 }} />
                      {art.view_count} xem
                    </span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* 5. STORE VALUES / BRAND PROMISES (CHUẨN TÔNG ĐỎ XÌMISTORE & SURFACE #FEF2F2) */}
      {/* <div
        style={{
          marginTop: 40,
          background: "#ffffff",
          borderRadius: 12,
          padding: "24px 28px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <Row gutter={[24, 20]}>
          <Col xs={24} sm={12} md={6}>
            <Space align="center" size={14}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#cb1c22",
                  fontSize: 22,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  100% Hàng Chính Hãng
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Nguồn gốc xuất xứ, đầy đủ VAT
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="center" size={14}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#cb1c22",
                  fontSize: 22,
                }}
              >
                <RocketOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  Giao Hàng Siêu Tốc
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Nhanh 2h hoặc toàn quốc miễn phí
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="center" size={14}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#cb1c22",
                  fontSize: 22,
                }}
              >
                <SyncOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  Đổi Trả Trong 30 Ngày
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Lỗi phần cứng 1 đổi 1 tận nơi
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="center" size={14}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#cb1c22",
                  fontSize: 22,
                }}
              >
                <CustomerServiceOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  Hỗ Trợ Kỹ Thuật 24/7
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Kỹ thuật viên nhiệt tình chu đáo
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </div> */}
    </div>
  );
};

export default HomePage;
