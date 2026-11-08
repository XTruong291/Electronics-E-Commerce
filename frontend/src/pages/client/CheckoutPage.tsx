import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Radio,
  Button,
  Typography,
  Divider,
  Space,
  Result,
  Select,
  Tag,
  message,
  Avatar,
  List,
  Popconfirm,
} from "antd";
import {
  ShoppingCartOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { useAuthStore } from "../../store/useAuthStore";
import { createOrder, cancelMyOrder } from "../../api/order.api";
import axiosClient from "../../api/axiosClient";
import type { Order, OrderCreatePayload } from "../../types/order";
import type { Address } from "../../types/auth";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

interface CheckoutFormValues {
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
  payment_method: string;
}

const CheckoutPage: React.FC = () => {
  const [form] = Form.useForm<CheckoutFormValues>();

  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const isAuthenticated = !!user;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Nếu người dùng đã đăng nhập, nạp thông tin mặc định & sổ địa chỉ
  useEffect(() => {
    if (isAuthenticated && user) {
      form.setFieldsValue({
        recipient_name: user.full_name || "",
        recipient_phone: user.phone || "",
        payment_method: "COD",
      });

      const fetchAddresses = async () => {
        try {
          const list = (await axiosClient.get(
            "/users/me/addresses"
          )) as unknown as Address[];
          setAddresses(list);

          // Nếu có địa chỉ mặc định, tự động điền
          const defaultAddr = list.find((a) => a.is_default) || list[0];
          if (defaultAddr) {
            form.setFieldsValue({
              recipient_name: defaultAddr.recipient,
              recipient_phone: defaultAddr.phone,
              shipping_address: `${defaultAddr.detail}, ${defaultAddr.ward}, ${defaultAddr.district}, ${defaultAddr.province}`,
            });
          }
        } catch {
          // Bỏ qua lỗi nếu chưa có địa chỉ
        }
      };

      fetchAddresses();
    } else {
      form.setFieldsValue({
        payment_method: "COD",
      });
    }
  }, [isAuthenticated, user, form]);

  // Xử lý chọn nhanh địa chỉ từ sổ địa chỉ
  const handleSelectSavedAddress = (addressId: number) => {
    const addr = addresses.find((a) => a.id === addressId);
    if (addr) {
      form.setFieldsValue({
        recipient_name: addr.recipient,
        recipient_phone: addr.phone,
        shipping_address: `${addr.detail}, ${addr.ward}, ${addr.district}, ${addr.province}`,
      });
      message.info("Đã điền thông tin từ địa chỉ được chọn.");
    }
  };

  // Submit thanh toán
  const onFinish = async (values: CheckoutFormValues) => {
    if (items.length === 0) {
      message.error("Giỏ hàng của bạn đang trống!");
      return;
    }

    setSubmitting(true);
    try {
      const payload: OrderCreatePayload = {
        recipient_name: values.recipient_name.trim(),
        recipient_phone: values.recipient_phone.trim(),
        shipping_address: values.shipping_address.trim(),
        note: values.note ? values.note.trim() : undefined,
        payment_method: values.payment_method || "COD",
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
        })),
      };

      const order = await createOrder(payload);
      clearCart();
      setPlacedOrder(order);
      message.success("Đặt hàng thành công!");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      message.error(
        errorObj.response?.data?.detail || "Không thể tạo đơn hàng. Vui lòng thử lại!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPlacedOrder = async () => {
    if (!placedOrder) return;
    setCancelling(true);
    try {
      const updated = await cancelMyOrder(placedOrder.id);
      setPlacedOrder(updated);
      message.success("Đã hủy đơn hàng thành công! Sản phẩm đã được hoàn lại kho.");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      message.error(
        errorObj.response?.data?.detail || "Không thể hủy đơn hàng. Vui lòng thử lại!"
      );
    } finally {
      setCancelling(false);
    }
  };

  // MÀN HÌNH ĐẶT HÀNG THÀNH CÔNG / ĐÃ HỦY
  if (placedOrder) {
    const isCancelled = placedOrder.status === "CANCELLED";
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px" }}>
        <Card style={{ borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", padding: "24px 12px" }}>
          <Result
            status={isCancelled ? "warning" : "success"}
            title={isCancelled ? "Đơn hàng đã được hủy thành công!" : "Đặt hàng thành công!"}
            subTitle={
              isCancelled
                ? `Mã đơn hàng: #${placedOrder.id} | Đơn hàng đã hủy và tồn kho đã được hoàn lại.`
                : `Mã đơn hàng: #${placedOrder.id} | Chúng tôi đã nhận được đơn hàng và đang chuẩn bị giao đến bạn.`
            }
            extra={[
              <Link to="/" key="home">
                <Button icon={<ShopOutlined />}>Tiếp tục mua hàng</Button>
              </Link>,
              <Link to="/orders" key="orders">
                <Button type="primary" style={{ background: "#cb1c22", borderColor: "#cb1c22" }}>
                  Xem đơn hàng của tôi
                </Button>
              </Link>,
              !isCancelled ? (
                <Popconfirm
                  key="cancel"
                  title="Hủy đơn hàng vừa đặt"
                  description="Bạn có chắc chắn muốn hủy đơn hàng này không? Sản phẩm sẽ được hoàn lại kho."
                  okText="Đồng ý hủy"
                  cancelText="Không"
                  okButtonProps={{ danger: true, loading: cancelling }}
                  onConfirm={handleCancelPlacedOrder}
                >
                  <Button danger>Hủy đơn hàng này</Button>
                </Popconfirm>
              ) : null,
            ]}
          >
            <div style={{ background: "#fafafa", padding: 20, borderRadius: 8, textAlign: "left" }}>
              <Title level={5} style={{ marginTop: 0 }}>
                Thông tin giao hàng & Đơn hàng
              </Title>
              <Paragraph style={{ margin: "4px 0" }}>
                <strong>Người nhận:</strong> {placedOrder.recipient_name} ({placedOrder.recipient_phone})
              </Paragraph>
              <Paragraph style={{ margin: "4px 0" }}>
                <strong>Địa chỉ giao:</strong> {placedOrder.shipping_address}
              </Paragraph>
              <Paragraph style={{ margin: "4px 0" }}>
                <strong>Phương thức:</strong> {placedOrder.payment_method === "COD" ? "Thanh toán khi nhận hàng (COD)" : placedOrder.payment_method}
              </Paragraph>
              <Paragraph style={{ margin: "4px 0" }}>
                <strong>Tổng thanh toán:</strong>{" "}
                <span style={{ color: "#cb1c22", fontWeight: 700, fontSize: 16 }}>
                  {formatPrice(placedOrder.total_amount)}
                </span>
              </Paragraph>
            </div>
          </Result>
        </Card>
      </div>
    );
  }

  // NẾU GIỎ HÀNG RỖNG
  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 16px" }}>
        <Card style={{ borderRadius: 12, textAlign: "center", padding: "48px 24px" }}>
          <Result
            icon={<ShoppingCartOutlined style={{ color: "#8c8c8c" }} />}
            title="Giỏ hàng của bạn đang trống"
            subTitle="Hãy chọn những sản phẩm công nghệ tuyệt vời để tiếp tục đặt hàng nhé!"
            extra={
              <Link to="/">
                <Button type="primary" size="large" icon={<ArrowLeftOutlined />}>
                  Khám phá sản phẩm ngay
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const totalPrice = getTotalPrice();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 64px" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/">
          <Button icon={<ArrowLeftOutlined />} shape="circle" />
        </Link>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Thanh toán đơn hàng
          </Title>
          <Text type="secondary">Vui lòng kiểm tra thông tin nhận hàng và danh sách sản phẩm</Text>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
        <Row gutter={[24, 24]}>
          {/* CỘT TRÁI: THÔNG TIN GIAO HÀNG */}
          <Col xs={24} md={14}>
            <Card
              title={
                <Space>
                  <EnvironmentOutlined style={{ color: "#cb1c22" }} />
                  <span>Thông tin người nhận</span>
                </Space>
              }
              bordered={false}
              style={{ borderRadius: 12, marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e5e7eb" }}
            >
              {/* Chọn nhanh từ sổ địa chỉ nếu có */}
              {isAuthenticated && addresses.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    Chọn nhanh từ Sổ địa chỉ đã lưu:
                  </Text>
                  <Select
                    placeholder="-- Chọn địa chỉ đã lưu --"
                    style={{ width: "100%" }}
                    onChange={handleSelectSavedAddress}
                    options={addresses.map((a) => ({
                      label: `${a.recipient} (${a.phone}) - ${a.detail}, ${a.ward}, ${a.district}, ${a.province} ${a.is_default ? "★ Mặc định" : ""}`,
                      value: a.id,
                    }))}
                  />
                  <Divider style={{ margin: "16px 0" }} />
                </div>
              )}

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="recipient_name"
                    label="Họ và tên người nhận"
                    rules={[{ required: true, message: "Vui lòng nhập họ tên người nhận!" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="recipient_phone"
                    label="Số điện thoại"
                    rules={[
                      { required: true, message: "Vui lòng nhập số điện thoại!" },
                      {
                        pattern: /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
                        message: "Số điện thoại không hợp lệ (10 số)!",
                      },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="0987654321" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="shipping_address"
                label="Địa chỉ nhận hàng chi tiết"
                rules={[{ required: true, message: "Vui lòng nhập địa chỉ nhận hàng chi tiết!" }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                />
              </Form.Item>

              <Form.Item name="note" label="Ghi chú đơn hàng (Tùy chọn)">
                <TextArea
                  rows={2}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi điện trước khi tới..."
                />
              </Form.Item>
            </Card>

            {/* PHƯƠNG THỨC THANH TOÁN */}
            <Card
              title={
                <Space>
                  <CreditCardOutlined style={{ color: "#cb1c22" }} />
                  <span>Phương thức thanh toán</span>
                </Space>
              }
              bordered={false}
              style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e5e7eb" }}
            >
              <Form.Item name="payment_method" style={{ marginBottom: 0 }}>
                <Radio.Group style={{ width: "100%" }}>
                  <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    <Radio
                      value="COD"
                      style={{
                        padding: "12px 16px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        width: "100%",
                        background: "#fff",
                      }}
                    >
                      <div>
                        <strong>Thanh toán khi nhận hàng (COD)</strong>
                        <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                          Bạn chỉ phải thanh toán khi đã nhận và kiểm tra hàng thực tế
                        </Text>
                      </div>
                    </Radio>
                    <Radio
                      value="BANK_TRANSFER"
                      style={{
                        padding: "12px 16px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        width: "100%",
                        background: "#fff",
                      }}
                    >
                      <div>
                        <strong>Chuyển khoản Ngân hàng (VietQR / Internet Banking)</strong>
                        <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                          Quét mã QR chuyển khoản nhanh sau khi đơn hàng được tạo
                        </Text>
                      </div>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Card>
          </Col>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <Col xs={24} md={10}>
            <Card
              title="Đơn hàng của bạn"
              extra={<Tag color="#cb1c22" style={{ border: "none", fontWeight: 700 }}>{items.length} món</Tag>}
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                position: "sticky",
                top: 24,
              }}
            >
              <List
                itemLayout="horizontal"
                dataSource={items}
                renderItem={(item) => {
                  const unitPrice =
                    item.product.sale_price !== null &&
                    item.product.sale_price !== undefined &&
                    item.product.sale_price > 0
                      ? item.product.sale_price
                      : item.product.price;

                  return (
                    <List.Item style={{ padding: "12px 0" }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            shape="square"
                            size={48}
                            src={
                              item.product.thumbnail_url ||
                              "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100"
                            }
                          />
                        }
                        title={
                          <Text strong style={{ fontSize: 13 }}>
                            {item.product.name}
                          </Text>
                        }
                        description={
                          <div style={{ fontSize: 12 }}>
                            {formatPrice(unitPrice)} × {item.quantity}
                          </div>
                        }
                      />
                      <div style={{ fontWeight: 600, color: "#1f1f1f", fontSize: 13 }}>
                        {formatPrice(unitPrice * item.quantity)}
                      </div>
                    </List.Item>
                  );
                }}
              />

              <Divider style={{ margin: "16px 0" }} />

              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">Tạm tính</Text>
                  <Text strong>{formatPrice(totalPrice)}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">Phí vận chuyển</Text>
                  <Text type="success" strong>
                    Miễn phí
                  </Text>
                </div>
                <Divider orientation="horizontal" style={{ margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text strong style={{ fontSize: 16 }}>
                    Tổng thanh toán
                  </Text>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#cb1c22" }}>
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </Space>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
                style={{
                  marginTop: 24,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: "#cb1c22",
                  borderColor: "#cb1c22",
                }}
              >
                Xác nhận đặt hàng
              </Button>

              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Bằng việc bấm Đặt hàng, bạn đồng ý với Điều khoản mua sắm của hệ thống.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default CheckoutPage;
