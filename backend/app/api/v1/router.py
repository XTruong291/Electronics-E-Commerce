from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    auth,
    categories,
    health,
    orders,
    products,
    upload,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(admin.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(upload.router)
