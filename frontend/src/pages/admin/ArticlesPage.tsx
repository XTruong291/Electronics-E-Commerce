import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Drawer,
  Form,
  Switch,
  message,
  Popconfirm,
  Image,
  Tooltip,
  Upload,
  Tabs,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadProps } from "antd";
import {
  ReadOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  FireFilled,
} from "@ant-design/icons";
import {
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../../api/article.api";
import { uploadProductImage } from "../../api/catalog.api";
import { useResponsive } from "../../hooks/useResponsive";
import type {
  Article,
  ArticleCreatePayload,
} from "../../types/article";
import ArticleContentRenderer from "../../components/ArticleContentRenderer";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const TOPIC_OPTIONS: { label: string; value: string; color: string }[] = [
  { label: "AI & Robotics", value: "AI & Robotics", color: "purple" },
  { label: "Thiết bị tương lai", value: "Thiết bị tương lai", color: "cyan" },
  { label: "Bán dẫn & Phần cứng", value: "Bán dẫn & Phần cứng", color: "geekblue" },
  { label: "Đánh giá & Xu hướng", value: "Đánh giá & Xu hướng", color: "orange" },
];

export const getTopicColor = (topic: string): string => {
  const match = TOPIC_OPTIONS.find((t) => t.value === topic);
  return match?.color || "blue";
};

interface ArticleFormValues {
  title: string;
  topic: string;
  summary: string;
  thumbnail_url?: string;
  content: string;
  is_featured: boolean;
  is_published: boolean;
}

const ArticlesPage: React.FC = () => {
  const { isMobile } = useResponsive();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [topicFilter, setTopicFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Drawer / Form state
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingThumb, setUploadingThumb] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("editor");

  const [form] = Form.useForm<ArticleFormValues>();

  // Watch form fields for Live Preview
  const watchedValues = Form.useWatch([], form);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getArticles({
        search: search.trim() || undefined,
        topic: topicFilter,
        is_published: statusFilter,
        include_unpublished: true,
        page,
        page_size: pageSize,
      });
      setArticles(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Lỗi nạp bài viết:", err);
      message.error("Không thể tải danh sách bài viết.");
    } finally {
      setLoading(false);
    }
  }, [search, topicFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleOpenCreate = () => {
    setEditingArticle(null);
    form.resetFields();
    form.setFieldsValue({
      topic: "AI & Robotics",
      is_featured: false,
      is_published: true,
      content: "## 1. Giới thiệu tổng quan\nNội dung giới thiệu bài viết...\n\n## 2. Các điểm đột phá\n- Điểm nổi bật thứ nhất\n- Điểm nổi bật thứ hai\n\n## 3. Kết luận và Xu hướng tương lai\nĐánh giá tổng kết...",
    });
    setActiveTab("editor");
    setDrawerOpen(true);
  };

  const handleOpenEdit = (article: Article) => {
    setEditingArticle(article);
    form.setFieldsValue({
      title: article.title,
      topic: article.topic,
      summary: article.summary,
      thumbnail_url: article.thumbnail_url || undefined,
      content: article.content,
      is_featured: article.is_featured,
      is_published: article.is_published,
    });
    setActiveTab("editor");
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingArticle(null);
  };

  const handleThumbnailUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploadingThumb(true);
    try {
      const res = await uploadProductImage(file as File);
      form.setFieldValue("thumbnail_url", res.url);
      message.success("Tải ảnh bìa bài viết lên Cloudinary thành công!");
      if (onSuccess) onSuccess(res);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Tải ảnh thất bại.");
      if (onError) onError(err as Error);
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleFormSubmit = async (values: ArticleFormValues) => {
    setSubmitting(true);
    try {
      const payload: ArticleCreatePayload = {
        title: values.title.trim(),
        topic: values.topic,
        summary: values.summary.trim(),
        content: values.content.trim(),
        thumbnail_url: values.thumbnail_url ? values.thumbnail_url.trim() : null,
        is_featured: values.is_featured,
        is_published: values.is_published,
      };

      if (editingArticle) {
        await updateArticle(editingArticle.id, payload);
        message.success(`Đã cập nhật bài viết "${values.title}" thành công!`);
      } else {
        await createArticle(payload);
        message.success(`Đã tạo bài viết "${values.title}" thành công!`);
      }

      setDrawerOpen(false);
      fetchArticles();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Lưu bài viết thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (article: Article) => {
    try {
      await deleteArticle(article.id);
      message.success(`Đã xóa bài viết "${article.title}" thành công.`);
      fetchArticles();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Xóa bài viết thất bại.");
    }
  };

  const columns: ColumnsType<Article> = [
    {
      title: "Ảnh bìa",
      dataIndex: "thumbnail_url",
      key: "thumbnail",
      width: 100,
      render: (url: string | null, record: Article) => (
        <Image
          src={url || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200"}
          alt={record.title}
          style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6 }}
          fallback="https://placehold.co/80x50/png?text=Tech"
        />
      ),
    },
    {
      title: "Tiêu đề & Tóm tắt",
      key: "title",
      render: (_: unknown, record: Article) => (
        <div style={{ maxWidth: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {record.is_featured && (
              <Tag color="red" style={{ fontWeight: 700, borderRadius: 10 }}>
                <FireFilled /> TÂM ĐIỂM
              </Tag>
            )}
            <Text strong style={{ fontSize: 14, color: "#111827" }}>
              {record.title}
            </Text>
          </div>
          <Paragraph
            ellipsis={{ rows: 2 }}
            type="secondary"
            style={{ fontSize: 12, margin: 0 }}
          >
            {record.summary}
          </Paragraph>
        </div>
      ),
    },
    {
      title: "Chủ đề",
      dataIndex: "topic",
      key: "topic",
      width: 170,
      render: (topic: string) => (
        <Tag color={getTopicColor(topic)} style={{ fontWeight: 600, padding: "2px 8px" }}>
          {topic}
        </Tag>
      ),
    },
    {
      title: "Tác giả",
      dataIndex: "author",
      key: "author",
      width: 140,
      render: (author?: { full_name: string } | null) => (
        <Text style={{ fontSize: 13 }}>{author?.full_name || "Quản trị viên"}</Text>
      ),
    },
    {
      title: "Lượt xem",
      dataIndex: "view_count",
      key: "view_count",
      width: 100,
      sorter: (a, b) => a.view_count - b.view_count,
      render: (count: number) => (
        <Space size={4} style={{ color: "#6b7280", fontSize: 13 }}>
          <EyeOutlined />
          <span>{Number(count || 0).toLocaleString("vi-VN")}</span>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "is_published",
      key: "is_published",
      width: 130,
      render: (isPub: boolean) =>
        isPub ? (
          <Tag color="success" style={{ fontWeight: 600 }}>
            Đã xuất bản
          </Tag>
        ) : (
          <Tag color="default" style={{ fontWeight: 600 }}>
            Bản nháp
          </Tag>
        ),
    },
    {
      title: "Ngày đăng",
      dataIndex: "created_at",
      key: "created_at",
      width: 140,
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(val).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </Text>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Article) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa bài viết">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Xóa bài viết">
            <Popconfirm
              title="Xác nhận xóa bài viết?"
              description={`Bạn có chắc muốn xóa "${record.title}"?`}
              onConfirm={() => handleDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
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
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ReadOutlined style={{ color: "#cb1c22" }} />
            Quản lý Bài viết Công nghệ & Thiết bị Tương lai
          </Title>
          <Text type="secondary">
            Biên tập và xuất bản các bài viết chuyên sâu về AI, bán dẫn, thiết bị đeo và phần cứng thế hệ mới
          </Text>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchArticles} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            style={{ background: "#cb1c22", borderColor: "#cb1c22" }}
          >
            Viết bài mới
          </Button>
        </Space>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: 16, borderRadius: 10 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Tìm theo tiêu đề, tóm tắt..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              fetchArticles();
            }}
            style={{ width: 280 }}
            allowClear
          />

          <Select
            placeholder="Lọc theo Chủ đề"
            style={{ width: 210 }}
            allowClear
            value={topicFilter}
            onChange={(val) => {
              setTopicFilter(val);
              setPage(1);
            }}
          >
            {TOPIC_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                <Tag color={opt.color} style={{ marginRight: 6 }}>
                  {opt.label}
                </Tag>
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Trạng thái xuất bản"
            style={{ width: 170 }}
            allowClear
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <Option value={true}>
              <Tag color="success">Đã xuất bản</Tag>
            </Option>
            <Option value={false}>
              <Tag color="default">Bản nháp</Tag>
            </Option>
          </Select>
        </Space>
      </Card>

      {/* Data Table */}
      <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: 0 }}>
        <Table<Article>
          columns={columns}
          dataSource={articles}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (tot) => `Tổng cộng ${tot} bài viết`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Drawer: Add / Edit Article (Large 860px or 100% on mobile) */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ReadOutlined style={{ color: "#cb1c22" }} />
            <span>{editingArticle ? "Chỉnh sửa bài viết công nghệ" : "Thêm bài viết công nghệ mới"}</span>
          </div>
        }
        width={isMobile ? "100%" : 860}
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
              style={{ background: "#cb1c22", borderColor: "#cb1c22" }}
            >
              {editingArticle ? "Cập nhật bài viết" : "Xuất bản bài viết"}
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "editor",
              label: "Soạn thảo bài viết",
              children: (
                <Form<ArticleFormValues>
                  form={form}
                  layout="vertical"
                  onFinish={handleFormSubmit}
                >
                  <Form.Item
                    name="title"
                    label="Tiêu đề bài viết"
                    rules={[{ required: true, message: "Vui lòng nhập tiêu đề bài viết" }]}
                  >
                    <Input
                      placeholder="Ví dụ: Kỷ nguyên Laptop AI & NPU trên chip thế hệ mới..."
                      size="large"
                      style={{ fontWeight: 600 }}
                    />
                  </Form.Item>

                  <Space size="large" style={{ display: "flex", marginBottom: 16 }}>
                    <Form.Item
                      name="topic"
                      label="Chủ đề công nghệ"
                      rules={[{ required: true, message: "Vui lòng chọn chủ đề" }]}
                      style={{ minWidth: 260 }}
                    >
                      <Select placeholder="Chọn chủ đề">
                        {TOPIC_OPTIONS.map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            <Tag color={opt.color}>{opt.label}</Tag>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="is_featured"
                      label="Bài viết tâm điểm (Spotlight)"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Tâm điểm" unCheckedChildren="Thường" />
                    </Form.Item>

                    <Form.Item
                      name="is_published"
                      label="Trạng thái hiển thị"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Xuất bản" unCheckedChildren="Bản nháp" />
                    </Form.Item>
                  </Space>

                  <Form.Item
                    name="thumbnail_url"
                    label="Ảnh bìa bài viết (Thumbnail URL)"
                    extra="Nhập URL trực tiếp hoặc bấm nút 'Tải ảnh lên' để upload vào Cloudinary."
                  >
                    <Space.Compact style={{ width: "100%" }}>
                      <Input placeholder="https://images.unsplash.com/... hoặc Cloudinary URL" />
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

                  <Form.Item
                    name="summary"
                    label="Tóm tắt dẫn đề (Summary)"
                    rules={[{ required: true, message: "Vui lòng nhập tóm tắt ngắn" }]}
                    extra="Tối đa 500 ký tự. Hiển thị ở danh sách bài viết và đoạn mở đầu."
                  >
                    <TextArea
                      rows={3}
                      maxLength={500}
                      showCount
                      placeholder="Tóm tắt ngắn gọn những điểm nổi bật nhất của bài viết..."
                    />
                  </Form.Item>

                  <Form.Item
                    name="content"
                    label="Nội dung chi tiết bài viết"
                    rules={[{ required: true, message: "Vui lòng nhập nội dung chi tiết" }]}
                    extra="Hỗ trợ tiêu đề phân đoạn '## Tiêu đề chính', '### Tiêu đề phụ', danh sách '- Gạch đầu dòng' và in đậm '**chữ đậm**'."
                  >
                    <TextArea
                      rows={14}
                      placeholder="## 1. Mở đầu bài viết&#10;Nội dung chi tiết...&#10;&#10;## 2. Các điểm công nghệ đột phá&#10;- Đột phá thứ nhất&#10;- Đột phá thứ hai"
                      style={{ fontFamily: "monospace", fontSize: 14 }}
                    />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "preview",
              label: "Xem trước trực quan (Live Preview)",
              children: (
                <div style={{ background: "#ffffff", padding: "16px 24px", borderRadius: 8 }}>
                  {watchedValues?.topic && (
                    <Tag color={getTopicColor(watchedValues.topic)} style={{ fontWeight: 600, marginBottom: 8 }}>
                      {watchedValues.topic}
                    </Tag>
                  )}
                  {watchedValues?.is_featured && (
                    <Tag color="red" style={{ fontWeight: 700, marginBottom: 8 }}>
                      <FireFilled /> BÀI VIẾT TÂM ĐIỂM
                    </Tag>
                  )}
                  <Title level={2} style={{ marginTop: 4, marginBottom: 12 }}>
                    {watchedValues?.title || "Chưa có tiêu đề bài viết"}
                  </Title>

                  {watchedValues?.thumbnail_url && (
                    <div style={{ marginBottom: 20 }}>
                      <img
                        src={watchedValues.thumbnail_url}
                        alt="Preview"
                        style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 10 }}
                      />
                    </div>
                  )}

                  {watchedValues?.summary && (
                    <div
                      style={{
                        background: "#f9fafb",
                        borderLeft: "4px solid #cb1c22",
                        padding: "14px 18px",
                        borderRadius: 6,
                        marginBottom: 24,
                        fontSize: 15,
                        fontStyle: "italic",
                        color: "#4b5563",
                      }}
                    >
                      {watchedValues.summary}
                    </div>
                  )}

                  <ArticleContentRenderer content={watchedValues?.content || ""} />
                </div>
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
};

export default ArticlesPage;
