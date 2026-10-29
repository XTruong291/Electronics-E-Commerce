from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryResponse


class ProductBase(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=100)
    price: int = Field(..., ge=0, description="Giá bán theo VNĐ")
    sale_price: Optional[int] = Field(None, ge=0, description="Giá khuyến mãi theo VNĐ")
    stock: int = Field(0, ge=0, description="Số lượng tồn kho")
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    images: List[str] = Field(default_factory=list)
    specifications: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[int] = Field(None, ge=0)
    sale_price: Optional[int] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    images: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    category_id: int
    name: str
    slug: str
    sku: str
    brand: str
    price: int
    sale_price: Optional[int] = None
    stock: int
    thumbnail_url: Optional[str] = None
    images: List[str]
    specifications: Dict[str, Any]
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int

