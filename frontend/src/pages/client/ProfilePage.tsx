import React, { useEffect, useState, useCallback } from "react";
import {
  Tabs,
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  Typography,
  Tag,
  Row,
  Col,
  Space,
  List,
  Badge,
  Modal,
  Popconfirm,
  message,
} from "antd";
import {
  UserOutlined,
  UploadOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { useAuthStore } from "../../store/useAuthStore";
import type { Address, AddressCreatePayload, User } from "../../types/auth";

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [addressForm] = Form.useForm();

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Address book states
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || "",
      });
    }
  }, [user, profileForm]);

  const fetchAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const data = (await axiosClient.get(
        "/users/me/addresses"
      )) as unknown as Address[];
      setAddresses(data);
    } catch {
      message.error("Không thể tải danh sách địa chỉ.");
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Profile update handler
  const handleUpdateProfile = async (values: { full_name: string; phone?: string }) => {
    setSavingProfile(true);
    try {
      const updated = (await axiosClient.patch(
        "/users/me",
        values
      )) as unknown as User;
      setUser(updated);
      message.success("Cập nhật thông tin cá nhân thành công!");
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Không thể cập nhật hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    setUploadingAvatar(true);
    try {
      const updated = (await axiosClient.post(
        "/users/me/avatar",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      )) as unknown as User;
      setUser(updated);
      message.success("Tải ảnh đại diện thành công!");
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Tải ảnh đại diện thất bại.");
    } finally {
      setUploadingAvatar(false);
    }
    return false; // Prevent automatic upload by antd
  };

  // Address create/update handler
  const handleSaveAddress = async (values: AddressCreatePayload) => {
    setSavingAddress(true);
    try {
      if (editingAddress) {
        await axiosClient.patch(`/users/me/addresses/${editingAddress.id}`, values);
        message.success("Cập nhật địa chỉ thành công!");
      } else {
        await axiosClient.post("/users/me/addresses", values);
        message.success("Thêm địa chỉ mới thành công!");
      }
      setAddressModalOpen(false);
      setEditingAddress(null);
      addressForm.resetFields();
      fetchAddresses();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Lưu địa chỉ thất bại.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      await axiosClient.patch(`/users/me/addresses/${addressId}`, {
        is_default: true,
      });
      message.success("Đã đặt làm địa chỉ mặc định!");
      fetchAddresses();
    } catch {
      message.error("Không thể đặt địa chỉ mặc định.");
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    try {
      await axiosClient.delete(`/users/me/addresses/${addressId}`);
      message.success("Đã xóa địa chỉ thành công!");
      fetchAddresses();
    } catch {
      message.error("Không thể xóa địa chỉ.");
    }
  };

  const openAddressModal = (addr?: Address) => {
    if (addr) {
      setEditingAddress(addr);
      addressForm.setFieldsValue(addr);
    } else {
      setEditingAddress(null);
      addressForm.resetFields();
      addressForm.setFieldsValue({ is_default: addresses.length === 0 });
    }
    setAddressModalOpen(true);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: "0 0 8px 0" }}>
          Tài khoản của tôi
        </Title>
        <Text type="secondary">
          Quản lý thông tin hồ sơ và sổ địa chỉ giao hàng của bạn
        </Text>
      </div>

      <Tabs
        defaultActiveKey="profile"
        type="card"
        size="large"
        items={[
          {
            key: "profile",
            label: (
              <span>
                <UserOutlined /> Thông tin cá nhân
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 12 }}>
                <Row gutter={[32, 24]}>
                  {/* Avatar section */}
                  <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                    <div style={{ marginBottom: 16 }}>
                      <Avatar
                        size={120}
                        src={user?.avatar_url}
                        icon={!user?.avatar_url && <UserOutlined style={{ fontSize: 50 }} />}
                        style={{
                          backgroundColor: "#1677ff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                    </div>

                    <Upload
                      showUploadList={false}
                      beforeUpload={handleAvatarUpload}
                      accept="image/png,image/jpeg,image/webp"
                    >
                      <Button
                        icon={<UploadOutlined />}
                        loading={uploadingAvatar}
                        style={{ borderRadius: 6 }}
                      >
                        Đổi ảnh đại diện
                      </Button>
                    </Upload>

                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Định dạng: JPG, PNG, WebP (Tối đa 5MB)
                      </Text>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Tag
                        color={
                          user?.role === "ADMIN"
                            ? "magenta"
                            : user?.role === "STAFF"
                            ? "blue"
                            : "green"
                        }
                        style={{ padding: "4px 12px", fontSize: 13, borderRadius: 12 }}
                      >
                        Vai trò: {user?.role}
                      </Tag>
                    </div>
                  </Col>

                  {/* Profile form section */}
                  <Col xs={24} sm={16}>
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleUpdateProfile}
                    >
                      <Form.Item label="Địa chỉ Email" name="email">
                        <Input
                          prefix={<MailOutlined />}
                          disabled
                          style={{ backgroundColor: "#f5f5f5" }}
                        />
                      </Form.Item>

                      <Form.Item
                        label="Họ và tên"
                        name="full_name"
                        rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
                      </Form.Item>

                      <Form.Item label="Số điện thoại" name="phone">
                        <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" />
                      </Form.Item>

                      <Form.Item style={{ marginTop: 24 }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={savingProfile}
                          size="large"
                          style={{ borderRadius: 6, fontWeight: 500 }}
                        >
                          Lưu thay đổi
                        </Button>
                      </Form.Item>
                    </Form>
                  </Col>
                </Row>
              </Card>
            ),
          },
          {
            key: "addresses",
            label: (
              <span>
                <HomeOutlined /> Sổ địa chỉ
              </span>
            ),
            children: (
              <Card
                style={{ borderRadius: 12 }}
                title="Danh sách địa chỉ giao hàng"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openAddressModal()}
                  >
                    Thêm địa chỉ mới
                  </Button>
                }
              >
                <List
                  loading={loadingAddresses}
                  dataSource={addresses}
                  locale={{ emptyText: "Bạn chưa có địa chỉ giao hàng nào." }}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      style={{
                        padding: "16px 20px",
                        borderRadius: 8,
                        marginBottom: 12,
                        background: item.is_default ? "#f6ffed" : "#fafafa",
                        border: item.is_default ? "1px solid #b7eb8f" : "1px solid #f0f0f0",
                      }}
                      actions={[
                        !item.is_default && (
                          <Button
                            type="link"
                            key="default"
                            onClick={() => handleSetDefaultAddress(item.id)}
                          >
                            Đặt làm mặc định
                          </Button>
                        ),
                        <Button
                          type="link"
                          key="edit"
                          icon={<EditOutlined />}
                          onClick={() => openAddressModal(item)}
                        >
                          Sửa
                        </Button>,
                        <Popconfirm
                          key="delete"
                          title="Bạn có chắc chắn muốn xóa địa chỉ này?"
                          onConfirm={() => handleDeleteAddress(item.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button type="link" danger icon={<DeleteOutlined />}>
                            Xóa
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{item.recipient}</Text>
                            <Text type="secondary">({item.phone})</Text>
                            {item.is_default && (
                              <Badge
                                count="Mặc định"
                                style={{ backgroundColor: "#52c41a" }}
                              />
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            <div>{item.detail}</div>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {item.ward}, {item.district}, {item.province}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Address Form Modal */}
      <Modal
        title={editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ giao hàng mới"}
        open={addressModalOpen}
        onOk={() => addressForm.submit()}
        confirmLoading={savingAddress}
        onCancel={() => {
          setAddressModalOpen(false);
          setEditingAddress(null);
        }}
        okText="Lưu địa chỉ"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form
          form={addressForm}
          layout="vertical"
          onFinish={handleSaveAddress}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="recipient"
                label="Tên người nhận"
                rules={[{ required: true, message: "Vui lòng nhập tên người nhận" }]}
              >
                <Input placeholder="Ví dụ: Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
              >
                <Input placeholder="Ví dụ: 0912345678" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="province"
                label="Tỉnh / Thành phố"
                rules={[{ required: true, message: "Nhập Tỉnh/Thành phố" }]}
              >
                <Input placeholder="Hà Nội / TP.HCM" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="district"
                label="Quận / Huyện"
                rules={[{ required: true, message: "Nhập Quận/Huyện" }]}
              >
                <Input placeholder="Cầu Giấy" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="ward"
                label="Phường / Xã"
                rules={[{ required: true, message: "Nhập Phường/Xã" }]}
              >
                <Input placeholder="Dịch Vọng" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="detail"
            label="Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà)"
            rules={[{ required: true, message: "Vui lòng nhập địa chỉ cụ thể" }]}
          >
            <Input placeholder="Ví dụ: Số 123, Đường Xuân Thủy" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
