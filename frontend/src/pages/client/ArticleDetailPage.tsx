import React, { useEffect, useState } from "react";
import {
  Typography,
  Breadcrumb,
  Tag,
  Avatar,
  Space,
  Row,
  Col,
  Card,
  Spin,
  Button,
  Empty,
  Divider,
} from "antd";
import {
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  FireFilled,
  ThunderboltFilled,
  ShoppingOutlined,
  ShareAltOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getArticleDetail, getArticles } from "../../api/article.api";
import type { Article } from "../../types/article";
import ArticleContentRenderer from "../../components/ArticleContentRenderer";
import { getTopicColor } from "../admin/ArticlesPage";

const { Title, Paragraph, Text } = Typography;

const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await getArticleDetail(slug);
        setArticle(data);

        // Fetch related articles by topic
        try {
          const related = await getArticles({
            topic: data.topic,
            page: 1,
            page_size: 5,
          });
          setRelatedArticles(related.items.filter((item) => item.id !== data.id));
        } catch {
          // Fallback if related fetch fails
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết bài viết:", err);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải nội dung bài viết..." />
      </div>
    );
  }

  if (!article) {
    return (
      <Card
        style={{
          maxWidth: 600,
          margin: "60px auto",
          borderRadius: 16,
          textAlign: "center",
          padding: "40px 20px",
        }}
      >
        <Empty
          description={
            <div>
              <Text strong style={{ fontSize: 16 }}>
                Không tìm thấy bài viết
              </Text>
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                Bài viết này không tồn tại hoặc đã bị ẩn.
              </Paragraph>
            </div>
          }
        >
          <Button type="primary" danger onClick={() => navigate("/news")}>
            Quay lại trang Tin công nghệ
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* 1. BREADCRUMB */}
      <Breadcrumb
        style={{ marginBottom: 20, fontSize: 13 }}
        items={[
          { title: <Link to="/">Trang chủ</Link> },
          { title: <Link to="/news">Tin công nghệ</Link> },
          {
            title: (
              <Link to={`/news?topic=${encodeURIComponent(article.topic)}`}>
                {article.topic}
              </Link>
            ),
          },
          {
            title: (
              <span style={{ color: "#6b7280" }}>
                {article.title.length > 40
                  ? `${article.title.slice(0, 40)}...`
                  : article.title}
              </span>
            ),
          },
        ]}
      />

      <Row gutter={[32, 32]}>
        {/* 2. MAIN READING COLUMN (LEFT) */}
        <Col xs={24} lg={16}>
          <article
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: "36px 32px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
            }}
          >
            {/* Topic & Badge */}
            <Space orientation="horizontal" size={8} style={{ marginBottom: 14 }}>
              <Tag
                color={getTopicColor(article.topic)}
                style={{
                  fontWeight: 600,
                  borderRadius: 6,
                  padding: "3px 12px",
                  fontSize: 12,
                }}
              >
                {article.topic}
              </Tag>
              {article.is_featured && (
                <Tag
                  color="error"
                  style={{
                    borderRadius: 6,
                    fontWeight: 700,
                    padding: "3px 10px",
                    fontSize: 12,
                  }}
                >
                  <FireFilled /> Nổi bật
                </Tag>
              )}
            </Space>

            {/* Main Title */}
            <Title
              level={1}
              style={{
                fontSize: "clamp(24px, 3.5vw, 32px)",
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.35,
                margin: "0 0 18px 0",
              }}
            >
              {article.title}
            </Title>

            {/* Author & Meta bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                paddingBottom: 20,
                borderBottom: "1px solid #f3f4f6",
                marginBottom: 24,
              }}
            >
              <Space size={12} align="center">
                <Avatar
                  size={42}
                  icon={<UserOutlined />}
                  style={{ background: "#cb1c22" }}
                />
                <div>
                  <Text strong style={{ fontSize: 14, color: "#111827", display: "block" }}>
                    {article.author?.full_name || "Ban Biên Tập XìMiStore"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Chuyên gia công nghệ & tương lai thiết bị
                  </Text>
                </div>
              </Space>

              <Space size={16} style={{ fontSize: 13, color: "#6b7280" }}>
                <span>
                  <CalendarOutlined style={{ marginRight: 6, color: "#9ca3af" }} />
                  {new Date(article.created_at).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span>
                  <EyeOutlined style={{ marginRight: 6, color: "#9ca3af" }} />
                  {article.view_count} lượt xem
                </span>
                <Button
                  size="small"
                  icon={copied ? <CheckOutlined /> : <ShareAltOutlined />}
                  onClick={handleShare}
                  style={{
                    borderRadius: 6,
                    color: copied ? "#16a34a" : undefined,
                  }}
                >
                  {copied ? "Đã copy link" : "Chia sẻ"}
                </Button>
              </Space>
            </div>

            {/* Lead Summary Callout */}
            {article.summary && (
              <div
                style={{
                  background: "#f9fafb",
                  borderLeft: "4px solid #cb1c22",
                  borderRadius: "0 10px 10px 0",
                  padding: "16px 20px",
                  marginBottom: 28,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "#374151",
                  fontStyle: "italic",
                }}
              >
                {article.summary}
              </div>
            )}

            {/* Hero Thumbnail */}
            {article.thumbnail_url && (
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 32,
                  aspectRatio: "16/9",
                  background: "#f3f4f6",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                }}
              >
                <img
                  src={article.thumbnail_url}
                  alt={article.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Article Content Rendered via semantic parser */}
            <ArticleContentRenderer content={article.content} />

            <Divider style={{ margin: "36px 0 24px" }} />

            {/* Bottom Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <Link to="/news">
                <Button icon={<ArrowLeftOutlined />} style={{ borderRadius: 8 }}>
                  Quay lại Tin công nghệ
                </Button>
              </Link>

              <Space size={10}>
                <Button
                  icon={copied ? <CheckOutlined /> : <ShareAltOutlined />}
                  onClick={handleShare}
                  style={{ borderRadius: 8 }}
                >
                  {copied ? "Đã sao chép link bài viết" : "Chia sẻ bài viết"}
                </Button>
              </Space>
            </div>
          </article>
        </Col>

        {/* 3. SIDEBAR (RIGHT) */}
        <Col xs={24} lg={8}>
          <div style={{ position: "sticky", top: 88, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Related Articles Card */}
            <Card
              bordered={false}
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ThunderboltFilled style={{ color: "#cb1c22" }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    Bài Viết Cùng Chủ Đề
                  </span>
                </div>
              }
              style={{
                borderRadius: 14,
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e5e7eb",
              }}
              bodyStyle={{ padding: "16px 20px" }}
            >
              {relatedArticles.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Chưa có thêm bài viết khác cùng chủ đề.
                </Text>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {relatedArticles.map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/news/${rel.slug}`}
                      style={{
                        display: "flex",
                        gap: 12,
                        textDecoration: "none",
                        color: "inherit",
                        transition: "opacity 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 56,
                          borderRadius: 8,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "#f3f4f6",
                        }}
                      >
                        <img
                          src={
                            rel.thumbnail_url ||
                            "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80"
                          }
                          alt={rel.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: "#111827",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            marginBottom: 4,
                          }}
                        >
                          {rel.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {new Date(rel.created_at).toLocaleDateString("vi-VN")} •{" "}
                          {rel.view_count} xem
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Store Promo Widget */}
            <Card
              bordered={false}
              style={{
                borderRadius: 14,
                background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
                color: "#ffffff",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
                border: "1px solid #374151",
              }}
              bodyStyle={{ padding: "24px 20px", textAlign: "center" }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(203, 28, 34, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                  color: "#cb1c22",
                  fontSize: 22,
                }}
              >
                <ShoppingOutlined />
              </div>

              <Title
                level={4}
                style={{
                  color: "#ffffff",
                  margin: "0 0 8px 0",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Trải Nghiệm Công Nghệ Mới Nhất
              </Title>

              <Paragraph
                style={{
                  color: "#9ca3af",
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 18,
                }}
              >
                Hàng ngàn sản phẩm laptop AI, điện thoại thông minh và linh kiện máy tính
                chính hãng đang sẵn hàng với ưu đãi tốt nhất tại XìMiStore.
              </Paragraph>

              <Link to="/">
                <Button
                  type="primary"
                  danger
                  icon={<ShoppingOutlined />}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    width: "100%",
                    height: 38,
                  }}
                >
                  Khám phá Cửa hàng ngay
                </Button>
              </Link>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ArticleDetailPage;

