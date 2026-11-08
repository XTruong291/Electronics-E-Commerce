import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Typography,
  Card,
  Popconfirm,
  Drawer,
  Form,
  Switch,
  InputNumber,
  Upload,
  Image,
  Badge,
  Row,
  Col,
  Divider,
  message,
  Tooltip,
  Spin,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  MinusCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  uploadProductImage,
} from "../../api/catalog.api";
import type {
  Category,
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
} from "../../types/catalog";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Fallback placeholder image for product thumbnails
const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2280%22%20height%3D%2280%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_1%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20sans-serif%3Bfont-size%3A10pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_1%22%3E%3Crect%20width%3D%2280%22%20height%3D%2280%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2218%22%20y%3D%2244%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E";

interface SpecItem {
  key: string;
  value: string;
}

interface ProductFormValues {
  name: string;
  sku: string;
  brand: string;
  category_id: number;
  price: number;
  sale_price?: number | null;
  stock: number;
  thumbnail_url?: string;
  images_list?: { url: string }[];
  specs_list?: SpecItem[];
  description?: string;
  is_active: boolean;
}

const COMMON_SPEC_SUGGESTIONS = [
  "CPU",
  "RAM",
  "Ổ cứng",
  "VGA",
  "Màn hình",
  "Pin",
  "Bảo hành",
  "Trọng lượng",
];

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    undefined
  );
  const [selectedStatus, setSelectedStatus] = useState<boolean | undefined>(
    undefined
  );

  // Drawer Form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [form] = Form.useForm<ProductFormValues>();

  // Fetch Categories for Filter and Form
  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await getCategories(true);
      setCategories(data);
    } catch (err) {
      console.error("Lỗi tải danh mục:", err);
      message.error("Không thể tải danh sách danh mục sản phẩm.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        category_id: selectedCategory,
        include_inactive: true,
        is_active: selectedStatus,
      });
      setProducts(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(
        anyErr.response?.data?.detail || "Không thể tải danh sách sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenDrawer = async (prod?: Product) => {
    loadCategories();
    if (prod) {
      try {
        // Fetch fresh detail with full specifications
        const fresh = await getProduct(prod.id);
        setEditingProduct(fresh);

        // Convert specifications record to Form.List array
        const specsList: SpecItem[] = Object.entries(
          fresh.specifications || {}
        ).map(([k, v]) => ({
          key: k,
          value: String(v),
        }));

        const imagesList = (fresh.images || []).map((url) => ({ url }));

        form.setFieldsValue({
          name: fresh.name,
          sku: fresh.sku,
          brand: fresh.brand,
          category_id: fresh.category_id,
          price: fresh.price,
          sale_price: fresh.sale_price ?? null,
          stock: fresh.stock,
          thumbnail_url: fresh.thumbnail_url || "",
          images_list: imagesList,
          specs_list: specsList,
          description: fresh.description || "",
          is_active: fresh.is_active,
        });
      } catch (err) {
        message.error("Không thể tải chi tiết sản phẩm.");
        return;
      }
    } else {
      setEditingProduct(null);
      form.resetFields();
      form.setFieldsValue({
        stock: 10,
        is_active: true,
        specs_list: [
          { key: "Bảo hành", value: "12 tháng" },
        ],
        images_list: [],
      });
    }
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
    form.resetFields();
  };

  // Upload Thumbnail Handler
  const handleThumbnailUpload: UploadProps["customRequest"] = async (
    options
  ) => {
    const { file, onSuccess, onError } = options;
    setUploadingThumb(true);
    try {
      const res = await uploadProductImage(file as File);
      form.setFieldValue("thumbnail_url", res.url);
      message.success("Tải ảnh đại diện thành công!");
      if (onSuccess) onSuccess(res);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(
        anyErr.response?.data?.detail || "Tải ảnh đại diện thất bại."
      );
      if (onError) onError(err as Error);
    } finally {
      setUploadingThumb(false);
    }
  };

  // Upload Additional Image Handler
  const handleGalleryUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploadingGallery(true);
    try {
      const res = await uploadProductImage(file as File);
      const currentImages = form.getFieldValue("images_list") || [];
      form.setFieldValue("images_list", [...currentImages, { url: res.url }]);
      message.success("Đã thêm ảnh phụ vào danh sách!");
      if (onSuccess) onSuccess(res);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Tải ảnh phụ thất bại.");
      if (onError) onError(err as Error);
    } finally {
      setUploadingGallery(false);
    }
  };

  // Form Submit Handler
  const handleFormFinish = async (values: ProductFormValues) => {
    setSubmitting(true);
    try {
      // Convert specs_list array back to specifications Record
      const specifications: Record<string, string> = {};
      (values.specs_list || []).forEach((item) => {
        if (item.key && item.key.trim() && item.value && item.value.trim()) {
          specifications[item.key.trim()] = item.value.trim();
        }
      });

      // Extract image urls
      const images: string[] = (values.images_list || [])
        .map((img) => img.url?.trim())
        .filter((url): url is string => Boolean(url));

      // Handle sale_price properly: null if not specified or <= 0
      const salePrice =
        values.sale_price !== undefined &&
        values.sale_price !== null &&
        Number(values.sale_price) > 0
          ? Number(values.sale_price)
          : null;

      const payload: ProductCreatePayload | ProductUpdatePayload = {
        name: values.name.trim(),
        sku: values.sku.trim(),
        brand: values.brand.trim(),
        category_id: values.category_id,
        price: Number(values.price),
        sale_price: salePrice,
        stock: Number(values.stock || 0),
        thumbnail_url: values.thumbnail_url?.trim() || null,
        images,
        specifications,
        description: values.description?.trim() || null,
        is_active: values.is_active,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        message.success("Cập nhật sản phẩm thành công!");
      } else {
        await createProduct(payload as ProductCreatePayload);
        message.success("Tạo sản phẩm mới thành công!");
      }

      handleCloseDrawer();
      fetchProducts();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Lưu sản phẩm thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (prod: Product) => {
    try {
      await deleteProduct(prod.id);
      message.success(`Đã xóa sản phẩm "${prod.name}" thành công!`);
      fetchProducts();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Không thể xóa sản phẩm.");
    }
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "thumbnail_url",
      key: "thumbnail_url",
      width: 75,
      render: (url: string | null) => (
        <Image
          width={54}
          height={54}
          src={url || FALLBACK_IMAGE}
          fallback={FALLBACK_IMAGE}
          style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #f0f0f0" }}
        />
      ),
    },
    {
      title: "Thông tin sản phẩm",
      key: "info",
      render: (_: unknown, record: Product) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {record.name}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              SKU: {record.sku}
            </Tag>
            <Tag color="cyan" style={{ fontSize: 11 }}>
              {record.brand}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: ["category", "name"],
      key: "category",
      width: 140,
      render: (catName: string | null) =>
        catName ? (
          <Tag color="purple">{catName}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Giá bán (VNĐ)",
      key: "price",
      width: 170,
      render: (_: unknown, record: Product) => {
        const hasSale =
          record.sale_price !== null &&
          record.sale_price !== undefined &&
          record.sale_price < record.price;

        return (
          <div>
            {hasSale ? (
              <>
                <div style={{ color: "#cb1c22", fontWeight: 700, fontSize: 14 }}>
                  {record.sale_price?.toLocaleString("vi-VN")} ₫
                </div>
                <div
                  style={{
                    color: "#8c8c8c",
                    textDecoration: "line-through",
                    fontSize: 12,
                  }}
                >
                  {record.price.toLocaleString("vi-VN")} ₫
                </div>
              </>
            ) : (
              <Text strong style={{ fontSize: 14 }}>
                {record.price.toLocaleString("vi-VN")} ₫
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Tồn kho",
      dataIndex: "stock",
      key: "stock",
      width: 120,
      render: (stock: number) => {
        if (stock === 0) {
          return <Tag color="red">Hết hàng</Tag>;
        }
        if (stock <= 5) {
          return <Tag color="orange">{stock} (Sắp hết)</Tag>;
        }
        return <Text>{stock} cái</Text>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (isActive: boolean) =>
        isActive ? (
          <Badge status="success" text="Đang bán" />
        ) : (
          <Badge status="error" text="Ngừng bán" />
        ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 150,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xác nhận xóa sản phẩm?"
            description={`Bạn có chắc muốn xóa "${record.name}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa sản phẩm">
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
      {/* Header */}
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
            Quản lý sản phẩm
          </Title>
          <Text type="secondary">
            Danh sách thiết bị điện tử, thông số kỹ thuật, giá bán và kho hàng
          </Text>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchProducts}
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenDrawer()}
          >
            Thêm sản phẩm mới
          </Button>
        </Space>
      </div>

      {/* Filter Card */}
      <Card style={{ marginBottom: 20, borderRadius: 8 }}>
        <Space wrap size="middle">
          <Input.Search
            placeholder="Tìm theo tên, SKU, hãng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
              fetchProducts();
            }}
            style={{ width: 260 }}
            allowClear
            prefix={<SearchOutlined />}
          />

          <Select
            placeholder="Lọc theo Danh mục"
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              setPage(1);
            }}
            style={{ width: 180 }}
            allowClear
            loading={loadingCategories}
            showSearch
            optionFilterProp="label"
            options={categories.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />

          <Select
            placeholder="Lọc Trạng thái"
            value={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setPage(1);
            }}
            style={{ width: 160 }}
            allowClear
          >
            <Option value={true}>Đang bán</Option>
            <Option value={false}>Ngừng bán</Option>
          </Select>

          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              fetchProducts();
            }}
          >
            Lọc dữ liệu
          </Button>
        </Space>
      </Card>

      {/* Products Table */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
          bordered
        />
      </Card>

      {/* Product Drawer (Width 820px) */}
      <Drawer
        title={
          editingProduct
            ? `Chỉnh sửa sản phẩm: ${editingProduct.name}`
            : "Thêm sản phẩm mới"
        }
        width={820}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleCloseDrawer}>Hủy</Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={submitting}
            >
              {editingProduct ? "Lưu thay đổi" : "Tạo sản phẩm"}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormFinish}
          requiredMark="optional"
        >
          {/* Section 1: Basic Info */}
          <Title level={5}>1. Thông tin chung</Title>
          <Row gutter={16}>
            <Col span={15}>
              <Form.Item
                name="name"
                label="Tên sản phẩm"
                rules={[
                  { required: true, message: "Vui lòng nhập tên sản phẩm" },
                ]}
              >
                <Input placeholder="Ví dụ: MacBook Air M2 13.6 inch" />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item
                name="sku"
                label="Mã SKU (Duy nhất)"
                rules={[{ required: true, message: "Vui lòng nhập mã SKU" }]}
              >
                <Input placeholder="LAP-APPLE-MBA-M2" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="brand"
                label="Hãng sản xuất (Brand)"
                rules={[{ required: true, message: "Vui lòng nhập hãng" }]}
              >
                <Input placeholder="Apple, Dell, Asus, Sony..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="category_id"
                label="Danh mục sản phẩm"
                rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
              >
                <Select
                  placeholder="Chọn danh mục"
                  loading={loadingCategories}
                  showSearch
                  optionFilterProp="label"
                  options={categories.map((c) => ({
                    label: `${c.name}${!c.is_active ? " (Đã ẩn)" : ""}`,
                    value: c.id,
                  }))}
                  notFoundContent={
                    loadingCategories ? (
                      <div style={{ padding: 12, textAlign: "center" }}>
                        <Spin size="small" /> Đang tải danh mục...
                      </div>
                    ) : (
                      <div style={{ padding: 12, textAlign: "center" }}>
                        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                          Chưa có danh mục nào trong hệ thống
                        </Text>
                        <Button
                          type="primary"
                          size="small"
                          style={{ background: "#cb1c22", borderColor: "#cb1c22" }}
                          onClick={() => {
                            setDrawerOpen(false);
                            navigate("/admin/categories");
                          }}
                        >
                          + Đi đến Quản lý danh mục
                        </Button>
                      </div>
                    )
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stock"
                label="Số lượng tồn kho"
                rules={[{ required: true, message: "Nhập tồn kho" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Giá niêm yết (VNĐ)"
                rules={[{ required: true, message: "Vui lòng nhập giá gốc" }]}
              >
                <InputNumber<number>
                  min={0}
                  step={100000}
                  style={{ width: "100%" }}
                  formatter={(val) =>
                    `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(val) =>
                    val ? Number(val.replace(/\$\s?|(,*)/g, "")) : 0
                  }
                  addonAfter="₫"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sale_price"
                label="Giá khuyến mãi (VNĐ - Tùy chọn)"
                dependencies={["price"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (value !== undefined && value !== null && value !== "") {
                        const numVal = Number(value);
                        const price = Number(getFieldValue("price"));
                        if (numVal <= 0) {
                          return Promise.reject(
                            new Error("Giá khuyến mãi phải lớn hơn 0")
                          );
                        }
                        if (price && numVal > price) {
                          return Promise.reject(
                            new Error(
                              "Giá khuyến mãi phải nhỏ hơn hoặc bằng giá niêm yết"
                            )
                          );
                        }
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber<number>
                  min={0}
                  step={100000}
                  style={{ width: "100%" }}
                  placeholder="Để trống nếu không có khuyến mãi"
                  formatter={(val) =>
                    val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
                  }
                  parser={(val) =>
                    val ? Number(val.replace(/\$\s?|(,*)/g, "")) : 0
                  }
                  addonAfter="₫"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "16px 0" }} />

          {/* Section 2: Media & Images */}
          <Title level={5}>2. Hình ảnh sản phẩm</Title>
          <Form.Item
            name="thumbnail_url"
            label="Ảnh đại diện chính (Thumbnail URL)"
            extra="Nhập URL trực tiếp hoặc bấm nút 'Tải ảnh lên' để upload vào Cloudinary."
          >
            <Space.Compact style={{ width: "100%" }}>
              <Input placeholder="https://res.cloudinary.com/..." />
              <Upload
                customRequest={handleThumbnailUpload}
                showUploadList={false}
                accept="image/png,image/jpeg,image/webp"
              >
                <Button icon={<UploadOutlined />} loading={uploadingThumb}>
                  Tải ảnh lên
                </Button>
              </Upload>
            </Space.Compact>
          </Form.Item>

          {/* Form.List for Additional Images */}
          <Form.Item label="Danh sách ảnh phụ (Gallery)">
            <Form.List name="images_list">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: "flex", marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, "url"]}
                        rules={[{ required: true, message: "Nhập URL ảnh" }]}
                        style={{ width: 620, margin: 0 }}
                      >
                        <Input placeholder="https://..." />
                      </Form.Item>
                      <MinusCircleOutlined
                        style={{ color: "#ff4d4f", fontSize: 16 }}
                        onClick={() => remove(name)}
                      />
                    </Space>
                  ))}

                  <Space style={{ marginTop: 4 }}>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      icon={<PlusOutlined />}
                    >
                      Thêm ô URL ảnh
                    </Button>
                    <Upload
                      customRequest={handleGalleryUpload}
                      showUploadList={false}
                      accept="image/png,image/jpeg,image/webp"
                    >
                      <Button
                        icon={<UploadOutlined />}
                        loading={uploadingGallery}
                      >
                        Tải ảnh phụ từ máy
                      </Button>
                    </Upload>
                  </Space>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Divider style={{ margin: "16px 0" }} />

          {/* Section 3: Dynamic Specifications */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              3. Thông số kỹ thuật (Specifications)
            </Title>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
              Gợi ý thêm nhanh:
            </Text>
            <Space wrap size={[4, 8]}>
              {COMMON_SPEC_SUGGESTIONS.map((sug) => (
                <Tag
                  key={sug}
                  style={{ cursor: "pointer" }}
                  color="blue"
                  onClick={() => {
                    const currentSpecs = form.getFieldValue("specs_list") || [];
                    const exists = currentSpecs.some(
                      (item: SpecItem) => item?.key === sug
                    );
                    if (!exists) {
                      form.setFieldValue("specs_list", [
                        ...currentSpecs,
                        { key: sug, value: "" },
                      ]);
                    }
                  }}
                >
                  + {sug}
                </Tag>
              ))}
            </Space>
          </div>

          <Form.List name="specs_list">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={12} key={key} style={{ marginBottom: 8 }}>
                    <Col span={9}>
                      <Form.Item
                        {...restField}
                        name={[name, "key"]}
                        rules={[{ required: true, message: "Nhập tên thông số" }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Ví dụ: CPU, RAM, Màn hình" />
                      </Form.Item>
                    </Col>
                    <Col span={13}>
                      <Form.Item
                        {...restField}
                        name={[name, "value"]}
                        rules={[{ required: true, message: "Nhập giá trị" }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Ví dụ: Apple M2, 16GB DDR5, 120Hz" />
                      </Form.Item>
                    </Col>
                    <Col
                      span={2}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MinusCircleOutlined
                        style={{ color: "#ff4d4f", fontSize: 16 }}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  </Row>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  Thêm thông số mới
                </Button>
              </>
            )}
          </Form.List>

          <Divider style={{ margin: "16px 0" }} />

          {/* Section 4: Details & Status */}
          <Title level={5}>4. Chi tiết & Trạng thái</Title>
          <Form.Item name="description" label="Mô tả sản phẩm">
            <TextArea
              rows={4}
              placeholder="Bài viết giới thiệu tính năng, cấu hình và bảo hành sản phẩm..."
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Trạng thái kinh doanh"
            valuePropName="checked"
          >
            <Switch checkedChildren="Đang bán" unCheckedChildren="Ngừng bán" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default ProductsPage;
