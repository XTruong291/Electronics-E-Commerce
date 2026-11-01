import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Button,
  Breadcrumb,
  Image,
  InputNumber,
  Space,
  Spin,
  Alert,
  message,
} from "antd";
import {
  ShoppingCartOutlined,
  ThunderboltOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  StarFilled,
  SafetyCertificateOutlined,
  CarOutlined,
  SyncOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProduct } from "../../api/catalog.api";
import { useCartStore } from "../../store/useCartStore";
import { useAuthStore } from "../../store/useAuthStore";
import type { Product } from "../../types/catalog";

const { Title, Text } = Typography;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (!slug) return;
    const fetchDetail = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getProduct(slug);
        setProduct(data);
        const initialImg =
          data.thumbnail_url ||
          (data.images && data.images.length > 0 ? data.images[0] : "") ||
          "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=60";
        setActiveImage(initialImg);
      } catch (err: unknown) {
        console.error("Lỗi tải chi tiết sản phẩm:", err);
        setErrorMsg("Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải thông tin sản phẩm..." />
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px" }}>
        <Alert
          type="error"
          showIcon
          message="Lỗi tải sản phẩm"
          description={errorMsg || "Sản phẩm không tồn tại."}
          action={
            <Button type="primary" onClick={() => navigate("/")} style={{ background: "#cb1c22", borderColor: "#cb1c22" }}>
              Quay lại Trang chủ
            </Button>
          }
        />
      </div>
    );
  }

  // Gallery hình ảnh
  const galleryImages: string[] = [];
  if (product.thumbnail_url) {
    galleryImages.push(product.thumbnail_url);
  }
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach((img) => {
      if (img && !galleryImages.includes(img)) {
        galleryImages.push(img);
      }
    });
  }
  if (galleryImages.length === 0) {
    galleryImages.push(
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=60"
    );
  }

  const hasDiscount =
    product.sale_price !== null &&
    product.sale_price !== undefined &&
    product.sale_price > 0 &&
    product.sale_price < product.price;

  const currentPrice = hasDiscount ? (product.sale_price as number) : product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.price - (product.sale_price || 0)) / product.price) * 100)
    : 0;

  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      message.warning("Sản phẩm đã hết hàng.");
      return;
    }
    addItem(product, quantity);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      message.warning("Sản phẩm đã hết hàng.");
      return;
    }
    addItem(product, quantity);
    if (!user) {
      message.warning("Vui lòng đăng nhập để tiến hành đặt hàng");
      navigate("/login?redirect=%2Fcheckout", { state: { from: "/checkout" } });
    } else {
      navigate("/checkout");
    }
  };

  const specs = product.specifications || {};
  const specEntries = Object.entries(specs);

  return (
    <div>
      {/* 1. BREADCRUMB */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <Link to="/" style={{ color: "#4b5563" }}>
                <HomeOutlined /> Trang chủ
              </Link>
            ),
          },
          {
            title: product.category?.name || "Sản phẩm",
          },
          {
            title: product.name,
          },
        ]}
      />

      {/* 2. UPPER FOLD: 2 CỘT 45% (ẢNH) VÀ 55% (THÔNG TIN MUA HÀNG) */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
        bodyStyle={{ padding: "24px" }}
      >
        <Row gutter={[32, 24]}>
          {/* CỘT TRÁI: ẢNH CHÍNH & GALLERY */}
          <Col xs={24} md={11}>
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #f3f4f6",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 380,
                padding: 20,
              }}
            >
              <Image
                src={activeImage}
                alt={product.name}
                style={{ maxHeight: 340, maxWidth: "100%", objectFit: "contain" }}
              />
            </div>

            {/* Dải Thumbnails selector */}
            {galleryImages.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      border: activeImage === img ? "2px solid #cb1c22" : "1px solid #e5e7eb",
                      padding: 4,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      flexShrink: 0,
                      transform: activeImage === img ? "scale(1.04)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx}`}
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Col>

          {/* CỘT PHẢI: THÔNG TIN CHI TIẾT & MUA HÀNG */}
          <Col xs={24} md={13}>
            {/* Metadata Tags */}
            <Space size={8} style={{ marginBottom: 8 }}>
              <Tag
                color="#cb1c22"
                style={{ fontSize: 12, padding: "2px 8px", fontWeight: 700, borderRadius: 4, border: "none" }}
              >
                {product.brand}
              </Tag>
              <Tag style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", border: "none" }}>
                SKU: {product.sku}
              </Tag>
              <span style={{ fontSize: 13, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                <StarFilled /> 5.0 <span style={{ color: "#9ca3af" }}>(120+ lượt đánh giá)</span>
              </span>
            </Space>

            {/* Product Title */}
            <Title
              level={3}
              style={{
                marginTop: 4,
                marginBottom: 14,
                lineHeight: 1.35,
                fontWeight: 800,
                fontSize: 22,
                color: "#111827",
              }}
            >
              {product.name}
            </Title>

            {/* Price Box */}
            <div
              style={{
                background: "#fff5f5",
                padding: "16px 20px",
                borderRadius: 10,
                border: "1px solid #fed7d7",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#d70018" }}>
                  {formatPrice(currentPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <Text delete type="secondary" style={{ fontSize: 16 }}>
                      {formatPrice(product.price)}
                    </Text>
                    <span
                      style={{
                        background: "#d70018",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      Tiết kiệm {discountPercent}%
                    </span>
                  </>
                )}
              </div>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Giá đã bao gồm 10% thuế VAT và miễn phí giao hàng toàn quốc)
                </Text>
              </div>
            </div>

            {/* Khung Khuyến mãi & Quyền lợi khách hàng */}
            <div
              style={{
                borderRadius: 10,
                background: "#fff8f8",
                border: "1px dashed #f87171",
                padding: "14px 18px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <GiftOutlined style={{ color: "#cb1c22", fontSize: 16 }} />
                <span style={{ color: "#cb1c22", fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>
                  Ưu đãi & Quyền lợi độc quyền
                </span>
              </div>
              <Space direction="vertical" size={6} style={{ width: "100%", fontSize: 13, color: "#374151" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SafetyCertificateOutlined style={{ color: "#16a34a" }} />
                  Bảo hành chính hãng 24 tháng tại các trung tâm ủy quyền toàn quốc
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CarOutlined style={{ color: "#2563eb" }} />
                  Giao nhanh trong 2 giờ tại nội thành, hỗ trợ kiểm tra hàng trước khi nhận
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SyncOutlined style={{ color: "#ea580c" }} />
                  Hư gì đổi nấy trong 30 ngày đầu tiên nếu có lỗi phần cứng từ nhà sản xuất
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CreditCardOutlined style={{ color: "#7c3aed" }} />
                  Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng và công ty tài chính
                </div>
              </Space>
            </div>

            {/* Stock status & Quantity Selector */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                {isOutOfStock ? (
                  <Tag color="error" style={{ fontSize: 13, padding: "3px 10px", borderRadius: 4 }}>
                    Tạm hết hàng
                  </Tag>
                ) : (
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 4 }}>
                    Còn hàng ({product.stock} sản phẩm sẵn có)
                  </Tag>
                )}
              </div>

              {!isOutOfStock && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Số lượng:</span>
                  <InputNumber<number>
                    min={1}
                    max={product.stock}
                    value={quantity}
                    onChange={(val) => setQuantity(val || 1)}
                    style={{ width: 80, borderRadius: 6 }}
                  />
                </div>
              )}
            </div>

            {/* Dual CTAs (MUA NGAY & THÊM VÀO GIỎ) */}
            <Row gutter={12}>
              <Col xs={14}>
                <Button
                  type="primary"
                  block
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  style={{
                    height: 52,
                    background: isOutOfStock ? undefined : "#cb1c22",
                    borderColor: isOutOfStock ? undefined : "#cb1c22",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 800 }}>MUA NGAY</span>
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>
                    Giao tận nơi hoặc nhận tại shop
                  </span>
                </Button>
              </Col>
              <Col xs={10}>
                <Button
                  block
                  icon={<ShoppingCartOutlined style={{ fontSize: 18 }} />}
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  style={{
                    height: 52,
                    borderRadius: 8,
                    borderColor: "#cb1c22",
                    color: "#cb1c22",
                    fontWeight: 700,
                    fontSize: 14,
                    background: "#fff",
                  }}
                >
                  THÊM VÀO GIỎ
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 3. LOWER FOLD: 2 CỘT (60% MÔ TẢ ĐÁNH GIÁ & 40% BẢNG THÔNG SỐ KẺ SỌC) */}
      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI (60%): BÀI VIẾT ĐÁNH GIÁ CHI TIẾT */}
        <Col xs={24} md={14}>
          <Card
            bordered={false}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ThunderboltOutlined style={{ color: "#cb1c22" }} />
                <span style={{ fontWeight: 700, fontSize: 16 }}>Đặc điểm nổi bật & Bài viết đánh giá</span>
              </div>
            }
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e5e7eb" }}
            bodyStyle={{ padding: "20px 24px" }}
          >
            {product.description ? (
              <div style={{ whiteSpace: "pre-line", lineHeight: 1.8, fontSize: 14, color: "#374151" }}>
                {product.description}
              </div>
            ) : (
              <Text type="secondary">Chưa có bài viết mô tả chi tiết cho sản phẩm này.</Text>
            )}
          </Card>
        </Col>

        {/* CỘT PHẢI (40%): BẢNG THÔNG SỐ KỸ THUẬT KẺ SỌC (ZEBRA-STRIPED TABLE) */}
        <Col xs={24} md={10}>
          <Card
            bordered={false}
            title={
              <span style={{ fontWeight: 700, fontSize: 16 }}>Thông số kỹ thuật chi tiết</span>
            }
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e5e7eb" }}
            bodyStyle={{ padding: "16px" }}
          >
            {specEntries.length > 0 ? (
              <table className="zebra-specs-table">
                <tbody>
                  {specEntries.map(([key, value]) => (
                    <tr key={key}>
                      <td className="spec-label">{key}</td>
                      <td className="spec-val">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Text type="secondary">Chưa có thông số kỹ thuật chi tiết cho sản phẩm này.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProductDetailPage;
