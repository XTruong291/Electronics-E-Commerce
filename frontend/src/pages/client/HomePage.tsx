import React, { useEffect, useState, useCallback } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Button,
  Input,
  Select,
  Pagination,
  Spin,
  Empty,
  Carousel,
  Space,
  Tooltip,
} from "antd";
import {
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  CustomerServiceOutlined,
  SyncOutlined,
  FireFilled,
  GiftOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../../api/catalog.api";
import { useCartStore } from "../../store/useCartStore";
import type { Category, Product } from "../../types/catalog";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Filter states
  const initialSearch = searchParams.get("search") || "";
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState<string>(initialSearch);
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Cập nhật khi searchParams thay đổi từ Header
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearchKeyword(urlSearch);
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
        category_id: selectedCategoryId,
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
  }, [selectedCategoryId, searchKeyword, selectedBrand, priceRange, sortBy, page, pageSize]);

  useEffect(() => {
    fetchProductList();
  }, [fetchProductList]);

  // Danh sách thương hiệu phổ biến
  const popularBrands = ["Apple", "Dell", "ASUS", "Lenovo", "HP", "Samsung", "Sony", "LG"];

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addItem(product, 1);
  };

  const handleResetFilters = () => {
    setSelectedCategoryId(undefined);
    setSearchKeyword("");
    setSelectedBrand(undefined);
    setPriceRange("all");
    setSortBy("created_at_desc");
    setPage(1);
    setSearchParams({});
  };

  return (
    <div>
      {/* 1. HERO BANNER: 2 CỘT 8:4 CHUẨN FPT SHOP / CELLPHONES */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {/* CỘT TRÁI (8 COLS): CAROUSEL BANNER CÔNG NGHỆ CAO CẤP */}
          <Col xs={24} md={16}>
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                height: 280,
                background: "#0f172a",
              }}
            >
              <Carousel autoplay effect="fade">
                {/* Slide 1 */}
                <div>
                  <div
                    style={{
                      height: 280,
                      background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ea580c 100%)",
                      color: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: "0 36px",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Tag
                        color="#fff"
                        style={{
                          color: "#dc2626",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          padding: "2px 10px",
                          borderRadius: 20,
                        }}
                      >
                        <FireFilled /> TUẦN LỄ SIÊU SALE
                      </Tag>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                        Trả góp 0% • Bảo hành 24 tháng
                      </span>
                    </div>
                    <Title level={2} style={{ color: "#fff", margin: "0 0 8px", fontWeight: 800, fontSize: 26 }}>
                      Laptop Gaming & Đồ Họa Cao Cấp
                    </Title>
                    <Paragraph style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, margin: "0 0 16px", maxWidth: 480 }}>
                      Giảm trực tiếp đến 30% cho Sinh viên & Dân văn phòng. Tặng kèm Balo cao cấp và Chuột không dây.
                    </Paragraph>
                    <div>
                      <Button
                        size="large"
                        style={{
                          background: "#fff",
                          color: "#dc2626",
                          fontWeight: 700,
                          borderRadius: 8,
                          border: "none",
                          height: 40,
                          padding: "0 22px",
                        }}
                        onClick={() => {
                          setSearchKeyword("Laptop");
                          setPage(1);
                        }}
                      >
                        Khám phá ngay <ArrowRightOutlined />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Slide 2 */}
                <div>
                  <div
                    style={{
                      height: 280,
                      background: "linear-gradient(135deg, #111827 0%, #1f2937 60%, #374151 100%)",
                      color: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: "0 36px",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Tag
                        color="#2563eb"
                        style={{
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          padding: "2px 10px",
                          borderRadius: 20,
                        }}
                      >
                        ⚡ APPLE FLAGSHIP
                      </Tag>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                        Nguyên seal 100% VN/A
                      </span>
                    </div>
                    <Title level={2} style={{ color: "#fff", margin: "0 0 8px", fontWeight: 800, fontSize: 26 }}>
                      iPhone 16 Series & MacBook M3
                    </Title>
                    <Paragraph style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, margin: "0 0 16px", maxWidth: 480 }}>
                      Thu cũ đổi mới trợ giá lên tới 3.000.000 ₫. Trả trước 0 đồng, duyệt hồ sơ nhanh qua CCCD.
                    </Paragraph>
                    <div>
                      <Button
                        size="large"
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          fontWeight: 700,
                          borderRadius: 8,
                          border: "none",
                          height: 40,
                          padding: "0 22px",
                        }}
                        onClick={() => {
                          setSelectedBrand("Apple");
                          setPage(1);
                        }}
                      >
                        Săn Deal Apple <ArrowRightOutlined />
                      </Button>
                    </div>
                  </div>
                </div>
              </Carousel>
            </div>
          </Col>

          {/* CỘT PHẢI (4 COLS): 2 BANNER PHỤ XẾP TẦNG */}
          <Col xs={24} md={8}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, height: 280 }}>
              {/* Banner trên */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                  border: "1px solid #fecdd3",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                }}
                className="product-card-hover"
                onClick={() => {
                  setSelectedBrand("ASUS");
                  setPage(1);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <GiftOutlined style={{ color: "#e11d48", fontSize: 16 }} />
                  <span style={{ color: "#e11d48", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>
                    Đặc quyền Học sinh - Sinh viên
                  </span>
                </div>
                <div style={{ color: "#881337", fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>
                  Giảm thêm 500.000 ₫
                </div>
                <div style={{ color: "#9f1239", fontSize: 13, marginTop: 4 }}>
                  Tặng Balo Laptop + Voucher phụ kiện chính hãng
                </div>
              </div>

              {/* Banner dưới */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                }}
                className="product-card-hover"
                onClick={() => {
                  setPriceRange("above-35m");
                  setPage(1);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <SyncOutlined style={{ color: "#16a34a", fontSize: 16 }} />
                  <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>
                    Thu cũ đổi mới - Lên đời
                  </span>
                </div>
                <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>
                  Trợ giá lên đến 2.500.000 ₫
                </div>
                <div style={{ color: "#166534", fontSize: 13, marginTop: 4 }}>
                  Định giá máy nhanh trong 5 phút, không cần bù tiền trước
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 2. FILTER CARD (SEARCH, BRAND PILLS, PRICE, SORT) */}
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
        {/* Hàng 1: Brand Quick-Pills & Category Buttons */}
        <div style={{ marginBottom: 16 }}>
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
              const isActive = selectedBrand === b;
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

          {/* Dải Danh mục */}
          {categories.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginRight: 4 }}>
                Nhóm hàng:
              </span>
              <Button
                size="small"
                type={selectedCategoryId === undefined ? "link" : "text"}
                onClick={() => {
                  setSelectedCategoryId(undefined);
                  setPage(1);
                }}
                style={{
                  fontSize: 13,
                  fontWeight: selectedCategoryId === undefined ? 700 : 500,
                  color: selectedCategoryId === undefined ? "#cb1c22" : "#4b5563",
                  padding: "0 6px",
                }}
              >
                Tất cả nhóm
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  size="small"
                  type={selectedCategoryId === c.id ? "link" : "text"}
                  onClick={() => {
                    setSelectedCategoryId(selectedCategoryId === c.id ? undefined : c.id);
                    setPage(1);
                  }}
                  style={{
                    fontSize: 13,
                    fontWeight: selectedCategoryId === c.id ? 700 : 500,
                    color: selectedCategoryId === c.id ? "#cb1c22" : "#4b5563",
                    padding: "0 6px",
                  }}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Hàng 2: Input search, mức giá, sắp xếp */}
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10} md={8}>
            <Search
              placeholder="Tìm kiếm theo tên thiết bị, mã sản phẩm..."
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={() => setPage(1)}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={12} sm={7} md={5}>
            <Select
              style={{ width: "100%" }}
              value={priceRange}
              onChange={(val) => {
                setPriceRange(val);
                setPage(1);
              }}
              options={[
                { label: "Mọi mức giá", value: "all" },
                { label: "Dưới 10 triệu", value: "under-10m" },
                { label: "10 triệu - 20 triệu", value: "10m-20m" },
                { label: "20 triệu - 35 triệu", value: "20m-35m" },
                { label: "Trên 35 triệu", value: "above-35m" },
              ]}
            />
          </Col>
          <Col xs={12} sm={7} md={5}>
            <Select
              style={{ width: "100%" }}
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
          </Col>
          <Col xs={24} md={6} style={{ textAlign: "right" }}>
            {(selectedCategoryId !== undefined ||
              selectedBrand !== undefined ||
              priceRange !== "all" ||
              searchKeyword !== "") && (
              <Button type="link" danger onClick={handleResetFilters} style={{ padding: 0 }}>
                Xóa tất cả bộ lọc
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      {/* 3. PRODUCT CARDS GRID (CHUẨN UI_DESIGN_SKILL.MD) */}
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
                              background: "#d70018",
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
                            <span style={{ color: "#d70018", fontWeight: 800, fontSize: 17 }}>
                              {formatPrice(product.sale_price as number)}
                            </span>
                            <span style={{ color: "#9ca3af", textDecoration: "line-through", fontSize: 12 }}>
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        ) : (
                          <div style={{ color: "#d70018", fontWeight: 800, fontSize: 17 }}>
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

      {/* 5. STORE VALUES / BRAND PROMISES */}
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
            <Space align="start" size={14}>
              <SafetyCertificateOutlined style={{ fontSize: 32, color: "#16a34a" }} />
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  100% Hàng Chính Hãng
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cam kết nguồn gốc xuất xứ, đầy đủ hóa đơn VAT
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="start" size={14}>
              <RocketOutlined style={{ fontSize: 32, color: "#2563eb" }} />
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  Giao Hàng Siêu Tốc
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Giao nhanh trong 2 giờ hoặc toàn quốc miễn phí
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="start" size={14}>
              <SyncOutlined style={{ fontSize: 32, color: "#ea580c" }} />
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  Đổi Trả Trong 30 Ngày
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Lỗi phần cứng 1 đổi 1 tận nơi nhanh chóng
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="start" size={14}>
              <CustomerServiceOutlined style={{ fontSize: 32, color: "#9333ea" }} />
              <div>
                <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                  Hỗ Trợ Kỹ Thuật 24/7
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Đội ngũ kỹ thuật viên giàu kinh nghiệm
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
