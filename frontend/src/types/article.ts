export interface ArticleAuthor {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

export type ArticleTopic =
  | "AI & Robotics"
  | "Thiết bị tương lai"
  | "Bán dẫn & Phần cứng"
  | "Đánh giá & Xu hướng"
  | string;

export interface Article {
  id: number;
  title: string;
  slug: string;
  topic: ArticleTopic;
  summary: string;
  content: string;
  thumbnail_url?: string | null;
  author_id?: number | null;
  author?: ArticleAuthor | null;
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleCreatePayload {
  title: string;
  slug?: string;
  topic: string;
  summary: string;
  content: string;
  thumbnail_url?: string | null;
  is_featured?: boolean;
  is_published?: boolean;
}

export interface ArticleUpdatePayload {
  title?: string;
  slug?: string;
  topic?: string;
  summary?: string;
  content?: string;
  thumbnail_url?: string | null;
  is_featured?: boolean;
  is_published?: boolean;
}

export interface ArticleFilterParams {
  search?: string;
  topic?: string;
  is_featured?: boolean;
  is_published?: boolean;
  include_unpublished?: boolean;
  page?: number;
  page_size?: number;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  page_size: number;
}
