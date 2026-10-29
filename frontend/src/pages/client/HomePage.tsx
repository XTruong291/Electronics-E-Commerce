import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Badge,
  message,
  Carousel,
  Space,
  Tooltip,
} from "antd";
import {
  ShoppingCartOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  CustomerServiceOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getCategories, getProducts } from "../../api/catalog.api";
import { useCartStore } from "../../store/useCartStore";
import type { Category, Product } from "../../types/catalog";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// Định dạng tiền VNĐ chuẩn
const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Filter states
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

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

  // Tải sản phẩm khi các điều kiện lọc thay đổi
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
      message.error("Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, searchKeyword, selectedBrand, priceRange, sortBy, page, pageSize]);

  useEffect(() => {
    fetchProductList();
  }, [fetchProductList]);

  // Danh sách các thương hiệu xuất hiện
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    // Thêm các brand công nghệ thông dụng
    ["Apple", "Dell", "Asus", "Lenovo", "Sony", "Samsung", "HP", "Acer", "LG"].forEach((b) =>
      brands.add(b)
    );
    return Array.from(brands);
  }, [products]);

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addItem(product, 1);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 8px 48px" }}>
      {/* 1. HERO PROMO BANNER CAROUSEL */}
      <div style={{ marginBottom: 28, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <Carousel autoplay effect="fade">
          <div>
            <div
              style={{
                height: 240,
                background: "linear-gradient(135deg, #0958d9 0%, #1677ff 50%, #4096ff 100%)",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 48px",
              }}
            >
              <Tag color="#ff4d4f" style={{ width: "fit-content", fontWeight: "bold", marginBottom: 8, fontSize: 13 }}>
                🔥 TUẦN LỄ SIÊU KHUYẾN MÃI
              </Tag>
              <Title level={2} style={{ color: "#fff", margin: "0 0 8px" }}>
                Đồ Công Nghệ & Laptop Chính Hãng
              </Title>
              <Paragraph style={{ color: "rgba(255,255,255,0.88)", fontSize: 16, margin: 0 }}>
                Giảm tới 30% cho Sinh viên & Dân văn phòng. Trả góp 0%, bảo hành 24 tháng chính hãng.
              </Paragraph>
            </div>
          </div>
          <div>
            <div
              style={{
                height: 240,
                background: "linear-gradient(135deg, #1f1f1f 0%, #2f54eb 60%, #722ed1 100%)",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 48px",
              }}
            >
              <Tag color="#52c41a" style={{ width: "fit-content", fontWeight: "bold", marginBottom: 8, fontSize: 13 }}>
                ⚡ FLAGSHIP CHÍNH HÃNG
              </Tag>
              <Title level={2} style={{ color: "#fff", margin: "0 0 8px" }}>
                Apple, Dell, Asus, Sony Mới Nhất
              </Title>
              <Paragraph style={{ color: "rgba(255,255,255,0.88)", fontSize: 16, margin: 0 }}>
                Cam kết chuẩn 100% nguyên seal, hỗ trợ giao siêu tốc nội thành trong 2 giờ.
              </Paragraph>
            </div>
          </div>
        </Carousel>
      </div>

      {/* 2. CATEGORY PILLS TABS */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Text strong style={{ marginRight: 6, fontSize: 14 }}>
            Danh mục:
          </Text>
          <Button
            type={selectedCategoryId === undefined ? "primary" : "default"}
            shape="round"
            onClick={() => {
              setSelectedCategoryId(undefined);
              setPage(1);
            }}
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              type={selectedCategoryId === cat.id ? "primary" : "default"}
              shape="round"
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setPage(1);
              }}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 3. FILTER BAR (SEARCH, BRAND, PRICE, SORT) */}
      <Card
        size="small"
        style={{
          marginBottom: 24,
          borderRadius: 10,
          background: "#fafafa",
          border: "1px solid #f0f0f0",
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={7}>
            <Search
              placeholder="Tìm tên sản phẩm, thông số..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={(val) => {
                setSearchKeyword(val.trim());
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: "100%" }}
              placeholder="Thương hiệu"
              allowClear
              value={selectedBrand}
              onChange={(val) => {
                setSelectedBrand(val);
                setPage(1);
              }}
              options={availableBrands.map((b) => ({ label: b, value: b }))}
            />
          </Col>
          <Col xs={12} sm={6} md={6}>
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
          <Col xs={24} sm={12} md={6}>
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
        </Row>
      </Card>

      {/* 4. PRODUCT GRID */}
      <Spin spinning={loading} tip="Đang tải danh sách thiết bị...">
        {products.length === 0 && !loading ? (
          <Empty
            description="Không tìm thấy sản phẩm nào phù hợp với bộ lọc."
            style={{ padding: "48px 0" }}
          >
            <Button
              type="primary"
              onClick={() => {
                setSelectedCategoryId(undefined);
                setSearchKeyword("");
                setSelectedBrand(undefined);
                setPriceRange("all");
                setPage(1);
              }}
            >
              Xóa bộ lọc
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

              // Rút trích 2 specs nổi bật nếu có
              const specs = product.specifications || {};
              const specKeys = Object.keys(specs).slice(0, 2);

              return (
                <Col xs={12} sm={8} md={6} lg={6} key={product.id}>
                  <Badge.Ribbon
                    text={hasDiscount ? `-${discountPercent}%` : ""}
                    color="red"
                    style={{ display: hasDiscount ? "block" : "none" }}
                  >
                    <Card
                      hoverable
                      onClick={() => navigate(`/products/${product.slug}`)}
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 10,
                        overflow: "hidden",
                        border: "1px solid #f0f0f0",
                        transition: "all 0.2s ease",
                      }}
                      bodyStyle={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "14px",
                      }}
                      cover={
                        <div
                          style={{
                            height: 200,
                            overflow: "hidden",
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 12,
                            position: "relative",
                          }}
                        >
                          <img
                            alt={product.name}
                            src={
                              product.thumbnail_url ||
                              "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=60"
                            }
                            style={{
                              maxHeight: "100%",
                              maxWidth: "100%",
                              objectFit: "contain",
                              transition: "transform 0.3s ease",
                            }}
                          />
                          {isOutOfStock && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.45)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Tag color="default" style={{ fontSize: 13, padding: "4px 8px" }}>
                                Tạm hết hàng
                              </Tag>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div>
                        {/* Brand & Stock Status */}
                        <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Tag color="blue" style={{ margin: 0, fontSize: 11, fontWeight: "bold" }}>
                            {product.brand}
                          </Tag>
                          <Text type={isOutOfStock ? "danger" : "secondary"} style={{ fontSize: 11 }}>
                            {isOutOfStock ? "Hết hàng" : `Còn ${product.stock}`}
                          </Text>
                        </div>

                        {/* Product Title */}
                        <Tooltip title={product.name}>
                          <Title
                            level={5}
                            ellipsis={{ rows: 2 }}
                            style={{
                              margin: "0 0 8px",
                              fontSize: 14,
                              lineHeight: "20px",
                              height: 40,
                              fontWeight: 600,
                            }}
                          >
                            {product.name}
                          </Title>
                        </Tooltip>

                        {/* Specs Highlights */}
                        {specKeys.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                            {specKeys.map((k) => (
                              <Tag
                                key={k}
                                style={{
                                  fontSize: 10,
                                  background: "#f5f5f5",
                                  border: "1px solid #e8e8e8",
                                  color: "#595959",
                                  margin: 0,
                                }}
                              >
                                {k}: {String(specs[k])}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pricing & Add to Cart button */}
                      <div>
                        <div style={{ marginBottom: 10 }}>
                          {hasDiscount ? (
                            <div>
                              <div style={{ color: "#d9363e", fontWeight: 700, fontSize: 16 }}>
                                {formatPrice(product.sale_price as number)}
                              </div>
                              <Text delete type="secondary" style={{ fontSize: 12 }}>
                                {formatPrice(product.price)}
                              </Text>
                            </div>
                          ) : (
                            <div style={{ color: "#1677ff", fontWeight: 700, fontSize: 16 }}>
                              {formatPrice(product.price)}
                            </div>
                          )}
                        </div>

                        <Space style={{ width: "100%" }} direction="vertical" size={6}>
                          <Button
                            type="primary"
                            icon={<ShoppingCartOutlined />}
                            block
                            disabled={isOutOfStock}
                            onClick={(e) => handleAddToCart(product, e)}
                            style={{
                              borderRadius: 6,
                              fontWeight: 500,
                              background: isOutOfStock ? undefined : "#ff4d4f",
                              borderColor: isOutOfStock ? undefined : "#ff4d4f",
                            }}
                          >
                            {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* 5. PAGINATION */}
      {total > 0 && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={(newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            showSizeChanger
            pageSizeOptions={["8", "12", "24", "48"]}
          />
        </div>
      )}

      {/* 6. TRUST BADGES / VALUE PROPOSITION */}
      <Card style={{ marginTop: 48, borderRadius: 12, background: "#fafafa" }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} md={6}>
            <Space align="start">
              <SafetyCertificateOutlined style={{ fontSize: 32, color: "#52c41a" }} />
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  100% Chính Hãng
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cam kết xuất xứ rõ ràng, đầy đủ VAT
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="start">
              <RocketOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  Giao Nhanh Siêu Tốc
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Giao trong 2h hoặc toàn quốc miễn phí
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="start">
              <SyncOutlined style={{ fontSize: 32, color: "#faad14" }} />
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  Đổi Trả Trong 30 Ngày
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Lỗi 1 đổi 1 nhanh chóng tại showroom
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space align="start">
              <CustomerServiceOutlined style={{ fontSize: 32, color: "#722ed1" }} />
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  Hỗ Trợ Kỹ Thuật 24/7
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Đội ngũ chuyên viên tư vấn tận tình
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default HomePage;
