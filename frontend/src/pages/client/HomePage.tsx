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
  Space,
  Tooltip,
} from "antd";
import type { CarouselRef } from "antd/es/carousel";
import {
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  CustomerServiceOutlined,
  SyncOutlined,
  FireFilled,
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../../api/catalog.api";
import { useCartStore } from "../../store/useCartStore";
import type { Category, Product } from "../../types/catalog";

const { Title, Text, Paragraph } = Typography;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
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
    fallbackImage: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&auto=format&fit=crop&q=80",
    tag: "XÌMISTORE FLAGSHIP",
    tagColor: "#cb1c22",
    subtitle: "Cam kết 100% Chính hãng VN/A • Đổi mới trong 30 ngày",
    title: "Hệ Thống Bán Lẻ Thiết Bị Công Nghệ Đỉnh Cao",
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
    title: "Ưu Đãi Độc Quyền & Trợ Giá Lên Đời Đến 3 Triệu",
    description: "Định giá máy cũ nhanh chóng qua hệ thống chuẩn xác, hỗ trợ chuyển đổi dữ liệu và trợ giá trực tiếp khi nâng cấp thiết bị mới.",
    ctaText: "Xem sản phẩm",
    hideTextOverlay: false,
  },
  {
    id: 3,
    image: "/banners/banner-3.jpg",
    fallbackImage: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1600&auto=format&fit=crop&q=80",
    tag: "DỊCH VỤ 5 SAO",
    tagColor: "#cb1c22",
    subtitle: "Hỗ trợ kỹ thuật 24/7 • Vệ sinh & Cài đặt máy trọn đời",
    title: "An Tâm Tuyệt Đối Với Chế Độ Hậu Mãi Chu Đáo",
    description: "Đội ngũ chuyên viên kỹ thuật chuyên nghiệp luôn sẵn sàng hỗ trợ khách hàng từ bảo dưỡng định kỳ đến xử lý sự cố từ xa.",
    ctaText: "Mua sắm ngay",
    hideTextOverlay: false,
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);
  const carouselRef = useRef<CarouselRef>(null);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      <div style={{ marginBottom: 24, position: "relative" }}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            height: 320,
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
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 38,
              height: 38,
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
            <LeftOutlined style={{ fontSize: 16 }} />
          </button>

          {/* Nút lướt sang phải */}
          <button
            type="button"
            aria-label="Next Slide"
            onClick={() => carouselRef.current?.next()}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 38,
              height: 38,
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
            <RightOutlined style={{ fontSize: 16 }} />
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
                      height: 320,
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
                          padding: "0 60px",
                          color: "#fff",
                        }}
                      >
                        {banner.tag && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "#cb1c22",
                                backgroundColor: "#cb1c22",
                                color: "#ffffff",
                                fontWeight: 800,
                                fontSize: 12,
                                padding: "4px 12px",
                                borderRadius: 9999,
                                letterSpacing: "0.5px",
                                boxShadow: "0 2px 8px rgba(203, 28, 34, 0.45)",
                              }}
                            >
                              <FireFilled style={{ color: "#ffffff", fontSize: 13 }} />
                              <span style={{ color: "#ffffff", fontWeight: 800 }}>{banner.tag}</span>
                            </span>
                            {banner.subtitle && (
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.92)" }}>
                                {banner.subtitle}
                              </span>
                            )}
                          </div>
                        )}
                        {banner.title && (
                          <Title level={2} style={{ color: "#fff", margin: "0 0 10px", fontWeight: 800, fontSize: 28 }}>
                            {banner.title}
                          </Title>
                        )}
                        {banner.description && (
                          <Paragraph style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, margin: "0 0 20px", maxWidth: 620 }}>
                            {banner.description}
                          </Paragraph>
                        )}
                        <div>
                          <Button
                            size="large"
                            style={{
                              background: "#cb1c22",
                              color: "#fff",
                              fontWeight: 700,
                              borderRadius: 8,
                              border: "none",
                              height: 42,
                              padding: "0 24px",
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
          {/* Hàng 1: Brand Quick-Pills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginRight: 4 }}>
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
          <Row gutter={[16, 16]}>
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

              // Rút trích 2-3 thông số kỹ thuật đặc trưng
              const specs = product.specifications || {};
              const specKeys = Object.keys(specs).slice(0, 3);

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
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      padding: 14,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <div>
                      {/* Top Badges Row: Giảm X% & Trả góp 0% */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                          minHeight: 22,
                        }}
                      >
                        {hasDiscount ? (
                          <span
                            style={{
                              background: "#cb1c22",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            Giảm {discountPercent}%
                          </span>
                        ) : (
                          <span />
                        )}

                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}
                        >
                          Trả góp 0%
                        </span>
                      </div>

                      {/* Product Image Box */}
                      <div
                        style={{
                          height: 180,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginBottom: 12,
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
                            <Tag color="default" style={{ fontSize: 12, padding: "3px 8px", fontWeight: 600 }}>
                              Tạm hết hàng
                            </Tag>
                          </div>
                        )}
                      </div>

                      {/* Brand Label */}
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                          {product.brand}
                        </span>
                      </div>

                      {/* Product Title (2-line clamp) */}
                      <Tooltip title={product.name}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1f2937",
                            lineHeight: "20px",
                            height: 40,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            marginBottom: 8,
                          }}
                        >
                          {product.name}
                        </div>
                      </Tooltip>

                      {/* Tech Specs Micro-Chips */}
                      {specKeys.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                          {specKeys.map((key) => (
                            <span
                              key={key}
                              style={{
                                background: "#f3f4f6",
                                color: "#4b5563",
                                fontSize: 11,
                                padding: "2px 6px",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {String(specs[key])}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price Block & Action Button */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ marginBottom: 10 }}>
                        {hasDiscount ? (
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ color: "#cb1c22", fontWeight: 800, fontSize: 17 }}>
                              {formatPrice(product.sale_price as number)}
                            </span>
                            <span style={{ color: "#9ca3af", textDecoration: "line-through", fontSize: 12 }}>
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        ) : (
                          <div style={{ color: "#cb1c22", fontWeight: 800, fontSize: 17 }}>
                            {formatPrice(product.price)}
                          </div>
                        )}
                      </div>

                      <Button
                        block
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        disabled={isOutOfStock}
                        onClick={(e) => handleAddToCart(product, e)}
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          fontSize: 13,
                          height: 36,
                          background: isOutOfStock ? undefined : "#cb1c22",
                          borderColor: isOutOfStock ? undefined : "#cb1c22",
                        }}
                      >
                        {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
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

      {/* 5. STORE VALUES / BRAND PROMISES (CHUẨN TÔNG ĐỎ XÌMISTORE & SURFACE #FEF2F2) */}
      <div
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
      </div>
    </div>
  );
};

export default HomePage;
