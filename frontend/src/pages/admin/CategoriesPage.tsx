import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Typography,
  Card,
  Popconfirm,
  Modal,
  Form,
  Switch,
  message,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/catalog.api";
import type {
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from "../../types/catalog";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories(true);
      setCategories(data);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(
        anyErr.response?.data?.detail || "Không thể tải danh sách danh mục."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      form.resetFields();
      form.setFieldsValue({
        is_active: true,
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleFormSubmit = async (values: {
    name: string;
    slug?: string;
    description?: string;
    is_active: boolean;
  }) => {
    setSubmitting(true);
    try {
      const payload: CategoryCreatePayload | CategoryUpdatePayload = {
        name: values.name.trim(),
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || undefined,
        is_active: values.is_active,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        message.success("Cập nhật danh mục thành công!");
      } else {
        await createCategory(payload as CategoryCreatePayload);
        message.success("Tạo danh mục mới thành công!");
      }
      handleCloseModal();
      fetchCategories();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(
        anyErr.response?.data?.detail || "Lưu danh mục thất bại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory(category.id);
      message.success(`Đã xóa danh mục "${category.name}" thành công!`);
      fetchCategories();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(
        anyErr.response?.data?.detail || "Không thể xóa danh mục."
      );
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Space>
          <AppstoreOutlined style={{ color: "#cb1c22" }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      render: (slug: string) => <Tag color="default">{slug}</Tag>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (desc: string | null) =>
        desc ? desc : <Text type="secondary">—</Text>,
    },
    {
      title: "Số sản phẩm",
      dataIndex: "product_count",
      key: "product_count",
      width: 130,
      render: (count: number = 0) => (
        <Tag color={count > 0 ? "blue" : "default"} style={{ fontSize: 13 }}>
          {count} sản phẩm
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 140,
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="green">Đang hoạt động</Tag>
        ) : (
          <Tag color="default">Tạm ẩn</Tag>
        ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Hành động",
      key: "action",
      width: 160,
      render: (_: unknown, record: Category) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xác nhận xóa danh mục?"
            description={`Bạn có chắc muốn xóa danh mục "${record.name}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip
              title={
                record.product_count && record.product_count > 0
                  ? "Danh mục đang có sản phẩm, không thể xóa"
                  : "Xóa danh mục này"
              }
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý danh mục sản phẩm
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Phân loại hàng hóa điện tử (Laptop, Điện thoại, Màn hình, Phụ kiện)
          </Paragraph>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchCategories}
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Thêm danh mục
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={false}
          bordered
        />
      </Card>

      <Modal
        title={editingCategory ? `Chỉnh sửa: ${editingCategory.name}` : "Thêm danh mục mới"}
        open={modalOpen}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        onCancel={handleCloseModal}
        okText={editingCategory ? "Lưu thay đổi" : "Tạo danh mục"}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              { required: true, message: "Vui lòng nhập tên danh mục" },
              { max: 100, message: "Tên không được vượt quá 100 ký tự" },
            ]}
          >
            <Input placeholder="Ví dụ: Laptop Gaming" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug đường dẫn (URL)"
            extra="Để trống nếu muốn hệ thống tự động sinh slug từ tên danh mục."
            rules={[{ max: 120, message: "Slug không vượt quá 120 ký tự" }]}
          >
            <Input placeholder="laptop-gaming" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả danh mục"
            rules={[{ max: 255, message: "Mô tả tối đa 255 ký tự" }]}
          >
            <TextArea
              rows={3}
              placeholder="Mô tả ngắn gọn về nhóm sản phẩm này..."
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Trạng thái hiển thị"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Hiển thị"
              unCheckedChildren="Tạm ẩn"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
