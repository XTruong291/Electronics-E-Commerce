"""Database seed script for E-Commerce web application.
Seeds initial Users (ADMIN, STAFF, CUSTOMER), Categories, and sample Products.
Ensures idempotency (safe to run multiple times).
"""
import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole


def seed_users(db: Session) -> None:
    seed_data = [
        {
            "email": "admin@example.com",
            "password": "Admin@123456",
            "full_name": "System Admin",
            "phone": "0901234567",
            "role": UserRole.ADMIN,
            "is_active": True,
        },
        {
            "email": "staff@example.com",
            "password": "Staff@123456",
            "full_name": "Store Staff",
            "phone": "0902345678",
            "role": UserRole.STAFF,
            "is_active": True,
        },
        {
            "email": "customer@example.com",
            "password": "Customer@123456",
            "full_name": "Nguyen Van A",
            "phone": "0903456789",
            "role": UserRole.CUSTOMER,
            "is_active": True,
        },
    ]

    for item in seed_data:
        existing = db.query(User).filter(User.email == item["email"]).first()
        if existing:
            print(f"[User] {item['email']} already exists. Updating role and status.")
            existing.role = item["role"]
            existing.is_active = item["is_active"]
            existing.password_hash = hash_password(item["password"])
            existing.full_name = item["full_name"]
            existing.phone = item["phone"]
        else:
            print(f"[User] Creating user {item['email']} ({item['role']})...")
            new_user = User(
                email=item["email"],
                password_hash=hash_password(item["password"]),
                full_name=item["full_name"],
                phone=item["phone"],
                role=item["role"],
                is_active=item["is_active"],
            )
            db.add(new_user)

    db.commit()


def seed_categories(db: Session) -> dict:
    categories_data = [
        {
            "name": "Laptop",
            "slug": "laptop",
            "description": "Máy tính xách tay cao cấp cho công việc và gaming",
            "is_active": True,
        },
        {
            "name": "Điện thoại",
            "slug": "dien-thoai",
            "description": "Điện thoại thông minh, smartphone chính hãng",
            "is_active": True,
        },
        {
            "name": "Màn hình",
            "slug": "man-hinh",
            "description": "Màn hình máy tính đồ họa và gaming cao cấp",
            "is_active": True,
        },
        {
            "name": "Phụ kiện",
            "slug": "phu-kien",
            "description": "Bàn phím cơ, chuột gaming, tai nghe và phụ kiện công nghệ",
            "is_active": True,
        },
    ]

    category_map = {}
    for item in categories_data:
        cat = db.query(Category).filter(Category.slug == item["slug"]).first()
        if cat:
            print(f"[Category] '{item['name']}' already exists. Updating info.")
            cat.name = item["name"]
            cat.description = item["description"]
            cat.is_active = item["is_active"]
        else:
            print(f"[Category] Creating category '{item['name']}'...")
            cat = Category(
                name=item["name"],
                slug=item["slug"],
                description=item["description"],
                is_active=item["is_active"],
            )
            db.add(cat)
            db.flush()
        category_map[item["slug"]] = cat

    db.commit()
    return category_map


def seed_products(db: Session, category_map: dict) -> None:
    products_data = [
        # --- Laptop ---
        {
            "category_slug": "laptop",
            "name": "MacBook Air M2 13.6 inch (8GB RAM / 256GB SSD)",
            "slug": "macbook-air-m2-13-6-inch-8gb-256gb",
            "sku": "LAP-APPLE-MBA-M2",
            "brand": "Apple",
            "price": 24990000,
            "sale_price": 22490000,
            "stock": 15,
            "thumbnail_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
            "images": [
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
                "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800",
            ],
            "specifications": {
                "CPU": "Apple M2 (8-core CPU / 8-core GPU)",
                "RAM": "8GB Unified Memory",
                "SSD": "256GB NVMe SSD",
                "Màn hình": "13.6 inch Liquid Retina (2560 x 1664)",
                "Trọng lượng": "1.24 kg",
                "Bảo hành": "12 tháng",
            },
            "description": "MacBook Air M2 với thiết kế phẳng siêu mỏng nhẹ, hiệu năng vượt trội và thời lượng pin ấn tượng lên tới 18 giờ.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "ASUS ROG Strix G16 G614JV (Core i7-13650HX / RTX 4060)",
            "slug": "asus-rog-strix-g16-g614jv-i7-rtx4060",
            "sku": "LAP-ASUS-ROG-G16",
            "brand": "Asus",
            "price": 38990000,
            "sale_price": 35490000,
            "stock": 10,
            "thumbnail_url": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
            "images": [
                "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i7-13650HX (14 nhân, 20 luồng)",
                "RAM": "16GB DDR5 4800MHz",
                "SSD": "512GB PCIe 4.0 NVMe",
                "VGA": "NVIDIA GeForce RTX 4060 8GB GDDR6",
                "Màn hình": "16 inch FHD+ 165Hz sRGB 100%",
                "Bảo hành": "24 tháng",
            },
            "description": "Cỗ máy gaming đỉnh cao dành cho game thủ và streamer chuyên nghiệp với card đồ họa RTX 4060 thế hệ mới.",
            "is_active": True,
        },
        # --- Điện thoại ---
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 15 Pro Max 256GB Titan Tự Nhiên",
            "slug": "iphone-15-pro-max-256gb-titan",
            "sku": "PHONE-APPLE-IP15PM-256",
            "brand": "Apple",
            "price": 30990000,
            "sale_price": 28490000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            "images": [
                "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            ],
            "specifications": {
                "Màn hình": "6.7 inch Super Retina XDR OLED 120Hz ProMotion",
                "Chip": "Apple A17 Pro (3nm)",
                "Bộ nhớ trong": "256GB",
                "Camera chính": "48MP + 12MP + 12MP (Zoom quang 5x)",
                "Pin": "4422 mAh (Sạc nhanh 20W)",
                "Bảo hành": "12 tháng",
            },
            "description": "Khung viền titan chuẩn hàng không vũ trụ siêu nhẹ và bền bỉ, chip A17 Pro đem lại hiệu năng đồ họa cực đại.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Samsung Galaxy S24 Ultra 5G 12GB/256GB",
            "slug": "samsung-galaxy-s24-ultra-5g-256gb",
            "sku": "PHONE-SS-S24U-256",
            "brand": "Samsung",
            "price": 31990000,
            "sale_price": 27990000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
            ],
            "specifications": {
                "Màn hình": "6.8 inch Dynamic AMOLED 2X 120Hz 2600 nits",
                "Chip": "Snapdragon 8 Gen 3 for Galaxy",
                "RAM": "12GB",
                "Bộ nhớ": "256GB",
                "Bút S-Pen": "Tích hợp sẵn",
                "Camera": "200MP + 50MP + 12MP + 10MP",
                "Bảo hành": "12 tháng",
            },
            "description": "Kỷ nguyên quyền năng Galaxy AI với khung viền Titan và bút S-Pen thông minh.",
            "is_active": True,
        },
        # --- Màn hình ---
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Dell UltraSharp U2724D 27 inch 2K IPS Black 120Hz",
            "slug": "man-hinh-dell-ultrasharp-u2724d-27-inch-2k",
            "sku": "MON-DELL-U2724D",
            "brand": "Dell",
            "price": 11490000,
            "sale_price": 10490000,
            "stock": 18,
            "thumbnail_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "QHD (2560 x 1440)",
                "Tấm nền": "IPS Black",
                "Tần số quét": "120Hz",
                "Độ phủ màu": "100% sRGB, 98% DCI-P3",
                "Cổng kết nối": "Thunderbolt 4, HDMI 2.1, DisplayPort 1.4",
                "Bảo hành": "36 tháng",
            },
            "description": "Màn hình đồ họa chuyên nghiệp với tấm nền IPS Black tỷ lệ tương phản 2000:1 cực sâu.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Gaming LG UltraGear 27GR75Q 27 inch 2K 165Hz",
            "slug": "man-hinh-lg-ultragear-27gr75q-27-inch-2k-165hz",
            "sku": "MON-LG-27GR75Q",
            "brand": "LG",
            "price": 6990000,
            "sale_price": 6290000,
            "stock": 30,
            "thumbnail_url": "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            "images": [
                "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "2K QHD (2560 x 1440)",
                "Tần số quét": "165Hz",
                "Thời gian đáp ứng": "1ms (GtG)",
                "Công nghệ": "NVIDIA G-Sync Compatible, AMD FreeSync Premium",
                "Bảo hành": "24 tháng",
            },
            "description": "Trải nghiệm gaming đỉnh cao không giật lag với tần số quét 165Hz và chuẩn G-Sync mượt mà.",
            "is_active": True,
        },
        # --- Phụ kiện ---
        {
            "category_slug": "phu-kien",
            "name": "Chuột không dây Logitech MX Master 3S",
            "slug": "chuot-logitech-mx-master-3s",
            "sku": "ACC-LOGI-MX3S",
            "brand": "Logitech",
            "price": 2490000,
            "sale_price": 2190000,
            "stock": 50,
            "thumbnail_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800",
            "images": [
                "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800",
            ],
            "specifications": {
                "Cảm biến": "Darkfield 8000 DPI",
                "Kết nối": "Bluetooth & Logi Bolt USB",
                "Thời lượng pin": "Lên tới 70 ngày",
                "Nút cuộn": "MagSpeed siêu nhanh và êm ái",
                "Bảo hành": "12 tháng",
            },
            "description": "Biểu tượng chuột công thái học cao cấp cho lập trình viên, designer và dân văn phòng.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Bàn phím cơ không dây Keychron K2 Pro QMK/VIA",
            "slug": "ban-phim-co-keychron-k2-pro",
            "sku": "ACC-KEYCHRON-K2PRO",
            "brand": "Keychron",
            "price": 2290000,
            "sale_price": 1990000,
            "stock": 40,
            "thumbnail_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            "images": [
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            ],
            "specifications": {
                "Layout": "75% (84 phím)",
                "Switch": "Keychron K Pro Red / Brown",
                "Hotswap": "Có hỗ trợ 3-pin & 5-pin",
                "Keycap": "PBT Double-shot OSA Profile",
                "Kết nối": "Bluetooth 5.1 & Type-C có dây",
                "Bảo hành": "12 tháng",
            },
            "description": "Bàn phím cơ tuỳ biến không giới hạn với phần mềm QMK/VIA, switch êm ái cùng keycap PBT bền bỉ.",
            "is_active": True,
        },
    ]

    for item in products_data:
        cat = category_map.get(item["category_slug"])
        if not cat:
            print(f"[Product Warning] Category '{item['category_slug']}' not found. Skipping {item['sku']}.")
            continue

        prod = db.query(Product).filter(Product.sku == item["sku"]).first()
        if prod:
            print(f"[Product] '{item['name']}' ({item['sku']}) already exists. Updating.")
            prod.category_id = cat.id
            prod.name = item["name"]
            prod.slug = item["slug"]
            prod.brand = item["brand"]
            prod.price = item["price"]
            prod.sale_price = item["sale_price"]
            prod.stock = item["stock"]
            prod.thumbnail_url = item["thumbnail_url"]
            prod.images = item["images"]
            prod.specifications = item["specifications"]
            prod.description = item["description"]
            prod.is_active = item["is_active"]
        else:
            print(f"[Product] Creating product '{item['name']}' ({item['sku']})...")
            prod = Product(
                category_id=cat.id,
                name=item["name"],
                slug=item["slug"],
                sku=item["sku"],
                brand=item["brand"],
                price=item["price"],
                sale_price=item["sale_price"],
                stock=item["stock"],
                thumbnail_url=item["thumbnail_url"],
                images=item["images"],
                specifications=item["specifications"],
                description=item["description"],
                is_active=item["is_active"],
            )
            db.add(prod)

    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        print("=== 1. Seeding Users ===")
        seed_users(db)

        print("\n=== 2. Seeding Categories ===")
        category_map = seed_categories(db)

        print("\n=== 3. Seeding Products ===")
        seed_products(db, category_map)

        print("\n🎉 Seed completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
