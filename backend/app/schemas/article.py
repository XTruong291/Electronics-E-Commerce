from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ArticleAuthorResponse(BaseModel):
    id: int
    full_name: str
    email: str
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ArticleBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Tiêu đề bài viết")
    slug: Optional[str] = Field(None, max_length=280, description="Đường dẫn tĩnh duy nhất")
    topic: str = Field(..., min_length=2, max_length=100, description="Chủ đề bài viết")
    summary: str = Field(..., min_length=5, max_length=500, description="Tóm tắt ngắn bài viết")
    content: str = Field(..., min_length=10, description="Nội dung chi tiết bài viết")
    thumbnail_url: Optional[str] = Field(None, max_length=500, description="URL ảnh bìa")
    is_featured: bool = Field(default=False, description="Bài viết tâm điểm nổi bật")
    is_published: bool = Field(default=True, description="Trạng thái xuất bản hoặc nháp")


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    slug: Optional[str] = Field(None, max_length=280)
    topic: Optional[str] = Field(None, min_length=2, max_length=100)
    summary: Optional[str] = Field(None, min_length=5, max_length=500)
    content: Optional[str] = Field(None, min_length=10)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None


class ArticleResponse(BaseModel):
    id: int
    title: str
    slug: str
    topic: str
    summary: str
    content: str
    thumbnail_url: Optional[str] = None
    author_id: Optional[int] = None
    author: Optional[ArticleAuthorResponse] = None
    is_featured: bool
    is_published: bool
    view_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArticleListResponse(BaseModel):
    items: List[ArticleResponse]
    total: int
    page: int
    page_size: int

