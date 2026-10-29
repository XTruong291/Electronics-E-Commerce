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
  Descriptions,
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
  SafetyCertificateOutlined,
  CarOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProduct } from "../../api/catalog.api";
import { useCartStore } from "../../store/useCartStore";
import type { Product } from "../../types/catalog";

const { Title, Text } = Typography;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

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
            <Button type="primary" onClick={() => navigate("/")}>
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
    navigate("/checkout");
  };

  const specs = product.specifications || {};
  const specEntries = Object.entries(specs);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 64px" }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          {
            title: (
              <Link to="/">
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

      {/* Main product view */}
      <Card style={{ borderRadius: 12, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <Row gutter={[32, 32]}>
          {/* CỘT TRÁI: ẢNH VÀ GALLERY */}
          <Col xs={24} md={11}>
            <div
              style={{
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #f0f0f0",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 380,
                padding: 16,
              }}
            >
              <Image
                src={activeImage}
                alt={product.name}
                style={{ maxHeight: 340, maxWidth: "100%", objectFit: "contain" }}
              />
            </div>

            {/* Thumbnail selector */}
            {galleryImages.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  overflowX: "auto",
                  paddingBottom: 8,
                }}
              >
                {galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 6,
                      border: activeImage === img ? "2px solid #1677ff" : "1px solid #d9d9d9",
                      padding: 4,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      flexShrink: 0,
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

          {/* CỘT PHẢI: THÔNG TIN MUA HÀNG */}
          <Col xs={24} md={13}>
            <Space orientation="horizontal" size={6} style={{ marginBottom: 8 }}>
              <Tag color="blue" style={{ fontSize: 13, padding: "2px 8px", fontWeight: "bold" }}>
                {product.brand}
              </Tag>
              <Tag style={{ fontSize: 12, padding: "2px 8px" }}>SKU: {product.sku}</Tag>
            </Space>

            <Title level={3} style={{ marginTop: 4, marginBottom: 12, lineHeight: 1.3 }}>
              {product.name}
            </Title>

            {/* Price Box */}
            <div
              style={{
                background: "#f9fbfd",
                padding: "16px 20px",
                borderRadius: 10,
                border: "1px solid #e6f4ff",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#d9363e" }}>
                  {formatPrice(currentPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <Text delete type="secondary" style={{ fontSize: 16 }}>
                      {formatPrice(product.price)}
                    </Text>
                    <Tag color="red" style={{ fontWeight: 600 }}>
                      Tiết kiệm {discountPercent}%
                    </Tag>
                  </>
                )}
              </div>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  (Giá đã bao gồm thuế VAT 10% và bảo hành chính hãng)
                </Text>
              </div>
            </div>

            {/* Stock status */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <Text strong style={{ minWidth: 80 }}>
                Tình trạng:
              </Text>
              {isOutOfStock ? (
                <Tag color="error" style={{ fontSize: 13, padding: "3px 10px" }}>
                  Tạm hết hàng
                </Tag>
              ) : (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 13, padding: "3px 10px" }}>
                  Còn hàng ({product.stock} sản phẩm sẵn có)
                </Tag>
              )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <Text strong style={{ minWidth: 80 }}>
                  Số lượng:
                </Text>
                <InputNumber<number>
                  min={1}
                  max={product.stock}
                  value={quantity}
                  onChange={(val) => setQuantity(val || 1)}
                  style={{ width: 100 }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <Space style={{ width: "100%", marginBottom: 24 }} size={12}>
              <Button
                type="primary"
                danger
                size="large"
                icon={<ThunderboltOutlined />}
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                style={{
                  height: 48,
                  padding: "0 28px",
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Mua ngay
              </Button>
              <Button
                type="default"
                size="large"
                icon={<ShoppingCartOutlined />}
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                style={{
                  height: 48,
                  padding: "0 24px",
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 8,
                  borderColor: "#1677ff",
                  color: "#1677ff",
                }}
              >
                Thêm vào giỏ hàng
              </Button>
            </Space>

            {/* Incentives / Offers */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: "#fafafa",
                border: "1px dashed #d9d9d9",
              }}
            >
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text style={{ fontSize: 13 }}>
                  <SafetyCertificateOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                  Bảo hành chính hãng 24 tháng tại các trung tâm ủy quyền
                </Text>
                <Text style={{ fontSize: 13 }}>
                  <CarOutlined style={{ color: "#1677ff", marginRight: 8 }} />
                  Miễn phí giao hàng tiêu chuẩn toàn quốc cho đơn từ 500.000 ₫
                </Text>
                <Text style={{ fontSize: 13 }}>
                  <SyncOutlined style={{ color: "#faad14", marginRight: 8 }} />
                  Đổi mới trong 30 ngày nếu phát sinh lỗi phần cứng do nhà sản xuất
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Specifications & Product Description */}
      <Row gutter={[24, 24]}>
        {/* THÔNG SỐ KỸ THUẬT */}
        <Col xs={24} md={10}>
          <Card
            title="Thông số kỹ thuật"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            {specEntries.length > 0 ? (
              <Descriptions
                bordered
                column={1}
                size="small"
                labelStyle={{ width: "40%", fontWeight: 600, background: "#fafafa" }}
              >
                {specEntries.map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <Text type="secondary">Chưa có thông số kỹ thuật chi tiết cho sản phẩm này.</Text>
            )}
          </Card>
        </Col>

        {/* MÔ TẢ CHI TIẾT */}
        <Col xs={24} md={14}>
          <Card
            title="Đặc điểm nổi bật & Bài viết đánh giá"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            {product.description ? (
              <div style={{ whiteSpace: "pre-line", lineHeight: 1.8, fontSize: 14 }}>
                {product.description}
              </div>
            ) : (
              <Text type="secondary">Chưa có bài viết mô tả chi tiết cho sản phẩm này.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProductDetailPage;
