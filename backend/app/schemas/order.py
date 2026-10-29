from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(1, gt=0, description="Số lượng sản phẩm đặt mua")


class OrderCreate(BaseModel):
    recipient_name: str = Field(..., min_length=1, max_length=100, description="Tên người nhận")
    recipient_phone: str = Field(..., min_length=1, max_length=20, description="Số điện thoại nhận hàng")
    shipping_address: str = Field(..., min_length=1, max_length=500, description="Địa chỉ nhận hàng chi tiết")
    note: Optional[str] = Field(None, description="Ghi chú giao hàng")
    payment_method: str = Field("COD", max_length=50, description="Phương thức thanh toán: COD, BANK_TRANSFER")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Danh sách sản phẩm trong đơn")


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    product_name: str
    product_image: Optional[str] = None
    unit_price: int
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    recipient_name: str
    recipient_phone: str
    shipping_address: str
    note: Optional[str] = None
    total_amount: int
    payment_method: str
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def order_id(self) -> int:
        return self.id


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderListResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
