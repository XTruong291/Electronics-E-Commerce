import React, { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Input,
  Pagination,
  Spin,
  Empty,
  Button,
  Avatar,
  Space,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  ArrowRightOutlined,
  FireFilled,
  ThunderboltFilled,
  RocketOutlined,
} from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import { getArticles } from "../../api/article.api";
import type { Article } from "../../types/article";
import { TOPIC_OPTIONS, getTopicColor } from "../admin/ArticlesPage";

const { Title, Paragraph, Text } = Typography;

const TechNewsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTopic = searchParams.get("topic") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = Number(searchParams.get("page") || "1");

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);

  const [searchInput, setSearchInput] = useState<string>(currentSearch);

  const pageSize = 9;

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getArticles({
        topic: currentTopic || undefined,
        search: currentSearch || undefined,
        page: currentPage,
        page_size: pageSize,
      });
      setArticles(res.items);
      setTotal(res.total);

      // On first load without filters, fetch 1 featured spotlight article
      if (!currentTopic && !currentSearch && currentPage === 1) {
        const featuredRes = await getArticles({
          is_featured: true,
          page: 1,
          page_size: 1,
        });
        if (featuredRes.items.length > 0) {
          setFeaturedArticle(featuredRes.items[0]);
        } else if (res.items.length > 0) {
          setFeaturedArticle(res.items[0]);
        }
      } else {
        setFeaturedArticle(null);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách bài viết:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTopic, currentSearch, currentPage]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleTopicChange = (topic: string) => {
    const params = new URLSearchParams(searchParams);
    if (topic) {
      params.set("topic", topic);
    } else {
      params.delete("topic");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("search", value.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  // Filter out the featured spotlight from the standard list only when on page 1 without filters
  const displayArticles =
    featuredArticle && !currentTopic && !currentSearch && currentPage === 1
      ? articles.filter((a) => a.id !== featuredArticle.id)
      : articles;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: 48 }}>
      {/* 1. HERO HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 20,
          padding: "36px 32px",
          color: "#ffffff",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -30,
            opacity: 0.08,
            fontSize: 240,
            color: "#ffffff",
            pointerEvents: "none",
          }}
        >
          <ThunderboltFilled />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 760 }}>
          <Space direction="horizontal" align="center" style={{ marginBottom: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(203, 28, 34, 0.2)",
                border: "1px solid rgba(203, 28, 34, 0.4)",
                color: "#ff8589",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <RocketOutlined /> XìMi Tech Insights
            </span>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
              Cập nhật liên tục 24/7
            </Text>
          </Space>

          <Title
            level={1}
            style={{
              color: "#ffffff",
              margin: "0 0 12px 0",
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            Tin Tức & Xu Hướng Công Nghệ Tương Lai
          </Title>

          <Paragraph
            style={{
              color: "#cbd5e1",
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            Khám phá kỷ nguyên trí tuệ nhân tạo (AI), vi xử lý bán dẫn thế hệ mới,
            công nghệ màn hình tương lai và các thiết bị điện tử đột phá thay đổi cuộc sống.
          </Paragraph>
        </div>
      </div>

      {/* 2. FEATURED SPOTLIGHT ARTICLE (When no filters and page 1) */}
      {featuredArticle && (
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <FireFilled style={{ color: "#cb1c22", fontSize: 18 }} />
            <Text strong style={{ fontSize: 18, color: "#111827" }}>
              Tâm Điểm Công Nghệ
            </Text>
          </div>

          <Card
            hoverable
            bordered={false}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
            }}
            bodyStyle={{ padding: 0 }}
          >
            <Row>
              <Col xs={24} md={13} lg={14}>
                <Link
                  to={`/news/${featuredArticle.slug}`}
                  style={{ display: "block", height: "100%", overflow: "hidden" }}
                >
                  <div
                    style={{
                      height: 380,
                      background: "#f3f4f6",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={
                        featuredArticle.thumbnail_url ||
                        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
                      }
                      alt={featuredArticle.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.4s ease",
                      }}
                      onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.transform = "scale(1.04)")
                      }
                      onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.transform = "scale(1.0)")
                      }
                    />
                  </div>
                </Link>
              </Col>

              <Col xs={24} md={11} lg={10}>
                <div
                  style={{
                    padding: "32px 28px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <Space size={8} wrap style={{ marginBottom: 12 }}>
                      <Tag
                        color={getTopicColor(featuredArticle.topic)}
                        style={{
                          fontWeight: 600,
                          borderRadius: 6,
                          padding: "2px 10px",
                          fontSize: 12,
                        }}
                      >
                        {featuredArticle.topic}
                      </Tag>
                      <Tag
                        color="error"
                        style={{
                          borderRadius: 6,
                          fontWeight: 700,
                          padding: "2px 8px",
                        }}
                      >
                        <FireFilled /> Nổi bật
                      </Tag>
                    </Space>

                    <Link
                      to={`/news/${featuredArticle.slug}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Title
                        level={3}
                        style={{
                          margin: "0 0 14px 0",
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#111827",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {featuredArticle.title}
                      </Title>
                    </Link>

                    <Paragraph
                      type="secondary"
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {featuredArticle.summary}
                    </Paragraph>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #f3f4f6" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Space size={8}>
                        <Avatar
                          size={28}
                          icon={<UserOutlined />}
                          style={{ background: "#cb1c22" }}
                        />
                        <Text strong style={{ fontSize: 13, color: "#374151" }}>
                          {featuredArticle.author?.full_name || "Ban Biên Tập XìMiStore"}
                        </Text>
                      </Space>

                      <Space size={14} style={{ fontSize: 12, color: "#9ca3af" }}>
                        <span>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {new Date(featuredArticle.created_at).toLocaleDateString("vi-VN")}
                        </span>
                        <span>
                          <EyeOutlined style={{ marginRight: 4 }} />
                          {featuredArticle.view_count}
                        </span>
                      </Space>
                    </div>

                    <Link to={`/news/${featuredArticle.slug}`}>
                      <Button
                        type="primary"
                        danger
                        icon={<ArrowRightOutlined />}
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          height: 38,
                          width: "100%",
                        }}
                      >
                        Đọc toàn bộ bài viết
                      </Button>
                    </Link>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* 3. FILTER PILLS & SEARCH BAR */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 28,
          border: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Topic Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <Button
            type={!currentTopic ? "primary" : "default"}
            danger={!currentTopic}
            shape="round"
            size="middle"
            onClick={() => handleTopicChange("")}
            style={{ fontWeight: 600 }}
          >
            Tất cả chủ đề
          </Button>

          {TOPIC_OPTIONS.map((t) => {
            const isSelected = currentTopic === t.value;
            return (
              <Button
                key={t.value}
                type={isSelected ? "primary" : "default"}
                danger={isSelected}
                shape="round"
                size="middle"
                onClick={() => handleTopicChange(t.value)}
                style={{ fontWeight: isSelected ? 700 : 500 }}
              >
                {t.label}
              </Button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: 260, flex: "0 1 320px" }}>
          <Input.Search
            placeholder="Tìm kiếm bài viết công nghệ..."
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
            size="middle"
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      {/* 4. ARTICLES GRID */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" tip="Đang nạp các bài viết công nghệ..." />
        </div>
      ) : displayArticles.length === 0 ? (
        <Card
          style={{
            borderRadius: 16,
            textAlign: "center",
            padding: "40px 20px",
            border: "1px dashed #d1d5db",
          }}
        >
          <Empty
            description={
              <div>
                <Text strong style={{ fontSize: 16, color: "#374151" }}>
                  Chưa tìm thấy bài viết phù hợp
                </Text>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang chủ đề khác.
                </Paragraph>
                <Button
                  onClick={() => {
                    setSearchInput("");
                    handleTopicChange("");
                    handleSearch("");
                  }}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 24]}>
            {displayArticles.map((art) => (
              <Col xs={24} sm={12} lg={8} key={art.id}>
                <Card
                  hoverable
                  bordered={false}
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
                    border: "1px solid #e5e7eb",
                    transition: "all 0.25s ease",
                  }}
                  bodyStyle={{
                    padding: 18,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Thumbnail */}
                    <Link
                      to={`/news/${art.slug}`}
                      style={{
                        display: "block",
                        borderRadius: 10,
                        overflow: "hidden",
                        marginBottom: 14,
                        aspectRatio: "16/9",
                        background: "#f3f4f6",
                      }}
                    >
                      <img
                        src={
                          art.thumbnail_url ||
                          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80"
                        }
                        alt={art.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.35s ease",
                        }}
                        onMouseEnter={(e) =>
                          ((e.target as HTMLElement).style.transform = "scale(1.05)")
                        }
                        onMouseLeave={(e) =>
                          ((e.target as HTMLElement).style.transform = "scale(1.0)")
                        }
                      />
                    </Link>

                    {/* Meta Topic & Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Tag
                        color={getTopicColor(art.topic)}
                        style={{
                          borderRadius: 6,
                          fontWeight: 600,
                          margin: 0,
                          fontSize: 11,
                        }}
                      >
                        {art.topic}
                      </Tag>
                      {art.is_featured && (
                        <Tag
                          color="error"
                          style={{
                            borderRadius: 6,
                            fontWeight: 700,
                            margin: 0,
                            fontSize: 11,
                          }}
                        >
                          <FireFilled /> Nổi bật
                        </Tag>
                      )}
                    </div>

                    {/* Title */}
                    <Link
                      to={`/news/${art.slug}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Title
                        level={4}
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#111827",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {art.title}
                      </Title>
                    </Link>

                    {/* Summary */}
                    <Paragraph
                      type="secondary"
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {art.summary}
                    </Paragraph>
                  </div>

                  {/* Footer Info */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    <span style={{ color: "#4b5563", fontWeight: 500 }}>
                      {art.author?.full_name || "XìMi Tech"}
                    </span>
                    <Space size={10}>
                      <span>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {new Date(art.created_at).toLocaleDateString("vi-VN")}
                      </span>
                      <span>
                        <EyeOutlined style={{ marginRight: 4 }} />
                        {art.view_count}
                      </span>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* 5. PAGINATION */}
          {total > pageSize && (
            <div
              style={{
                marginTop: 40,
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TechNewsPage;
