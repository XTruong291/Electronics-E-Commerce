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
        # ==========================================
        # 1. LAPTOP (15 SẢN PHẨM)
        # ==========================================
        {
            "category_slug": "laptop",
            "name": "MacBook Air M2 13.6 inch (8GB RAM / 256GB SSD)",
            "slug": "macbook-air-m2-13-6-inch-8gb-256gb",
            "sku": "LAP-MAC-MBA-M2-8-256",
            "brand": "Apple",
            "price": 24990000,
            "sale_price": 22490000,
            "stock": 25,
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
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "MacBook Air M2 với thiết kế phẳng siêu mỏng nhẹ, hiệu năng vượt trội và thời lượng pin ấn tượng lên tới 18 giờ.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "MacBook Air M3 15.3 inch (16GB RAM / 512GB SSD)",
            "slug": "macbook-air-m3-15-3-inch-16gb-512gb",
            "sku": "LAP-MAC-MBA-M3-16-512",
            "brand": "Apple",
            "price": 37990000,
            "sale_price": 34990000,
            "stock": 18,
            "thumbnail_url": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800",
            "images": [
                "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800",
            ],
            "specifications": {
                "CPU": "Apple M3 (8-core CPU / 10-core GPU)",
                "RAM": "16GB Unified Memory",
                "SSD": "512GB PCIe SSD",
                "Màn hình": "15.3 inch Liquid Retina 500 nits",
                "Trọng lượng": "1.51 kg",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Màn hình 15 inch rộng rãi trong thân hình siêu mỏng, chip Apple M3 hỗ trợ Ray Tracing cực đỉnh.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "MacBook Pro 14 inch M3 Pro (18GB RAM / 512GB SSD)",
            "slug": "macbook-pro-14-inch-m3-pro-18gb-512gb",
            "sku": "LAP-MAC-MBP-M3P-18",
            "brand": "Apple",
            "price": 52990000,
            "sale_price": 48990000,
            "stock": 12,
            "thumbnail_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
            "images": [
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
            ],
            "specifications": {
                "CPU": "Apple M3 Pro (11-core CPU / 14-core GPU)",
                "RAM": "18GB Unified Memory",
                "SSD": "512GB Superfast SSD",
                "Màn hình": "14.2 inch Liquid Retina XDR 120Hz ProMotion",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Vũ khí tối thượng cho coder, dựng phim chuyên nghiệp với màn hình XDR 1600 nits và thời lượng pin 22h.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "MacBook Pro 16 inch M3 Max (36GB RAM / 1TB SSD)",
            "slug": "macbook-pro-16-inch-m3-max-36gb-1tb",
            "sku": "LAP-MAC-MBP-M3M-36",
            "brand": "Apple",
            "price": 92990000,
            "sale_price": 86990000,
            "stock": 8,
            "thumbnail_url": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800",
            "images": [
                "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800",
            ],
            "specifications": {
                "CPU": "Apple M3 Max (14-core CPU / 30-core GPU)",
                "RAM": "36GB Unified Memory",
                "SSD": "1TB NVMe SSD",
                "Màn hình": "16.2 inch Liquid Retina XDR 120Hz",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Sức mạnh đồ họa tương đương máy trạm cao cấp nhất, màu Space Black chống bám vân tay đỉnh cao.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Dell XPS 13 Plus 9320 (Core i7-1360P / 16GB / 512GB / 3.5K OLED)",
            "slug": "dell-xps-13-plus-9320-i7-16gb-512gb",
            "sku": "LAP-DELL-XPS-9320",
            "brand": "Dell",
            "price": 45990000,
            "sale_price": 41500000,
            "stock": 15,
            "thumbnail_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
            "images": [
                "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i7-1360P (12 nhân, 16 luồng)",
                "RAM": "16GB LPDDR5 6000MHz",
                "SSD": "512GB PCIe 4.0 NVMe",
                "Màn hình": "13.4 inch 3.5K OLED Touch (3456 x 2160)",
                "Trọng lượng": "1.23 kg",
                "Bảo hành": "24 tháng Premium",
            },
            "description": "Kiệt tác công nghệ với bàn di chuột kính vô cực và dải phím cảm ứng điện dung tương lai.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Dell XPS 15 9530 (Core i9-13900H / 32GB / 1TB / RTX 4070)",
            "slug": "dell-xps-15-9530-i9-32gb-1tb-rtx4070",
            "sku": "LAP-DELL-XPS-9530",
            "brand": "Dell",
            "price": 68990000,
            "sale_price": 62990000,
            "stock": 10,
            "thumbnail_url": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
            "images": [
                "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i9-13900H (14 nhân, 20 luồng)",
                "RAM": "32GB DDR5 4800MHz",
                "SSD": "1TB PCIe NVMe M.2",
                "VGA": "NVIDIA GeForce RTX 4070 8GB GDDR6",
                "Màn hình": "15.6 inch 3.5K OLED (3456 x 2160) Touch",
                "Bảo hành": "24 tháng",
            },
            "description": "Laptop đa phương tiện mạnh mẽ nhất dành cho nhà sáng tạo nội dung 3D và dựng video 4K/8K.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Dell Inspiron 14 5430 (Core i5-1335U / 16GB / 512GB / FHD+)",
            "slug": "dell-inspiron-14-5430-i5-16gb-512gb",
            "sku": "LAP-DELL-INSP-5430",
            "brand": "Dell",
            "price": 19490000,
            "sale_price": 17890000,
            "stock": 30,
            "thumbnail_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
            "images": [
                "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i5-1335U (10 nhân, 12 luồng)",
                "RAM": "16GB LPDDR5 4800MHz",
                "SSD": "512GB PCIe NVMe",
                "Màn hình": "14 inch FHD+ (1920 x 1200) WVA",
                "Bảo hành": "12 tháng",
            },
            "description": "Lựa chọn hoàn hảo cho sinh viên và dân văn phòng với thiết kế nhôm cứng cáp, pin bền bỉ.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Dell Inspiron 16 5630 (Core i7-1360P / 16GB / 1TB / FHD+)",
            "slug": "dell-inspiron-16-5630-i7-16gb-1tb",
            "sku": "LAP-DELL-INSP-5630",
            "brand": "Dell",
            "price": 25990000,
            "sale_price": 22990000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
            "images": [
                "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i7-1360P (12 nhân, 16 luồng)",
                "RAM": "16GB LPDDR5",
                "SSD": "1TB PCIe NVMe",
                "Màn hình": "16.0 inch FHD+ 16:10 WVA",
                "Bảo hành": "12 tháng",
            },
            "description": "Màn hình 16 inch rộng rãi giúp tối ưu đa nhiệm bảng tính, xử lý công việc và giải trí trọn vẹn.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "ASUS ROG Strix G16 G614JV (Core i7-13650HX / RTX 4060)",
            "slug": "asus-rog-strix-g16-g614jv-i7-rtx4060",
            "sku": "LAP-ASUS-ROG-G16",
            "brand": "ASUS",
            "price": 38990000,
            "sale_price": 35490000,
            "stock": 16,
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
                "Bảo hành": "24 tháng chính hãng",
            },
            "description": "Cỗ máy gaming đỉnh cao dành cho game thủ và streamer chuyên nghiệp với card đồ họa RTX 4060 thế hệ mới.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "ASUS TUF Gaming A15 FA507 (Ryzen 7 7735HS / RTX 4050)",
            "slug": "asus-tuf-gaming-a15-fa507-r7-rtx4050",
            "sku": "LAP-ASUS-TUF-A15",
            "brand": "ASUS",
            "price": 27490000,
            "sale_price": 24990000,
            "stock": 22,
            "thumbnail_url": "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=800",
            "images": [
                "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=800",
            ],
            "specifications": {
                "CPU": "AMD Ryzen 7 7735HS (8 nhân, 16 luồng)",
                "RAM": "16GB DDR5 4800MHz",
                "SSD": "512GB PCIe 4.0 NVMe",
                "VGA": "NVIDIA GeForce RTX 4050 6GB GDDR6",
                "Màn hình": "15.6 inch FHD 144Hz 100% sRGB",
                "Bảo hành": "24 tháng chính hãng",
            },
            "description": "Độ bền chuẩn quân đội MIL-STD-810H, tản nhiệt buồng hơi mát lạnh, chiến mượt mọi tựa game AAA.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "ASUS Zenbook 14 OLED UX3405 (Core Ultra 7 155H / 32GB / 1TB)",
            "slug": "asus-zenbook-14-oled-ux3405-ultra7-32gb-1tb",
            "sku": "LAP-ASUS-ZEN-UX3405",
            "brand": "ASUS",
            "price": 34990000,
            "sale_price": 31990000,
            "stock": 14,
            "thumbnail_url": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800",
            "images": [
                "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core Ultra 7 155H (16 nhân, 22 luồng, NPU AI)",
                "RAM": "32GB LPDDR5X 7467MHz",
                "SSD": "1TB PCIe 4.0 NVMe",
                "Màn hình": "14.0 inch 3K OLED 120Hz 0.2ms HDR 500 nits",
                "Trọng lượng": "1.2 kg",
                "Bảo hành": "24 tháng quốc tế",
            },
            "description": "Laptop AI thế hệ mới với màn hình 3K OLED rực rỡ chuẩn điện ảnh và thời lượng pin hơn 15 tiếng.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "ASUS Vivobook 15 OLED A1505 (Core i5-13500H / 16GB / 512GB)",
            "slug": "asus-vivobook-15-oled-a1505-i5-16gb-512gb",
            "sku": "LAP-ASUS-VIVO-15",
            "brand": "ASUS",
            "price": 18490000,
            "sale_price": 16490000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            "images": [
                "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i5-13500H (12 nhân, 16 luồng)",
                "RAM": "16GB DDR4",
                "SSD": "512GB M.2 NVMe",
                "Màn hình": "15.6 inch FHD OLED 600 nits DCI-P3 100%",
                "Bảo hành": "24 tháng",
            },
            "description": "Màn hình OLED rực rỡ bảo vệ mắt trong tầm giá dưới 17 triệu đồng, chip dòng H hiệu năng mạnh mẽ.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Lenovo ThinkPad X1 Carbon Gen 11 (Core i7-1355U / 32GB / 1TB)",
            "slug": "lenovo-thinkpad-x1-carbon-gen-11-i7-32gb-1tb",
            "sku": "LAP-LEN-X1-CARB-G11",
            "brand": "Lenovo",
            "price": 54990000,
            "sale_price": 49990000,
            "stock": 10,
            "thumbnail_url": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800",
            "images": [
                "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i7-1355U (10 nhân, 12 luồng)",
                "RAM": "32GB LPDDR5 6400MHz",
                "SSD": "1TB SSD PCIe Gen 4",
                "Màn hình": "14 inch 2.8K OLED (2880 x 1800) 100% DCI-P3",
                "Trọng lượng": "1.12 kg",
                "Bảo hành": "36 tháng Premier Support",
            },
            "description": "Biểu tượng laptop doanh nhân cao cấp: sợi carbon siêu bền, bàn phím gõ êm nhất thế giới, bảo mật cấp độ cao.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Lenovo Legion Pro 5 16IRX9 (Core i7-14650HX / RTX 4060 / 32GB)",
            "slug": "lenovo-legion-pro-5-16irx9-i7-rtx4060-32gb",
            "sku": "LAP-LEN-LEG-PRO5",
            "brand": "Lenovo",
            "price": 46990000,
            "sale_price": 42500000,
            "stock": 15,
            "thumbnail_url": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
            "images": [
                "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i7-14650HX (16 nhân, 24 luồng, Turbo 5.2GHz)",
                "RAM": "32GB DDR5 5600MHz",
                "SSD": "1TB PCIe 4.0 NVMe",
                "VGA": "NVIDIA GeForce RTX 4060 8GB GDDR6 (TGP 140W)",
                "Màn hình": "16 inch WQXGA 240Hz 500 nits 100% sRGB",
                "Bảo hành": "36 tháng Legion Ultimate Support",
            },
            "description": "Chiến binh đồ họa và gaming hạng nặng với tản nhiệt Coldfront 5.0 và chip AI Lenovo LA1 tối ưu FPS tự động.",
            "is_active": True,
        },
        {
            "category_slug": "laptop",
            "name": "Lenovo IdeaPad Slim 5 14IRH8 (Core i5-13420H / 16GB / 512GB)",
            "slug": "lenovo-ideapad-slim-5-14irh8-i5-16gb-512gb",
            "sku": "LAP-LEN-IDEA-SLIM5",
            "brand": "Lenovo",
            "price": 17490000,
            "sale_price": 15990000,
            "stock": 28,
            "thumbnail_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            "images": [
                "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            ],
            "specifications": {
                "CPU": "Intel Core i5-13420H (8 nhân, 12 luồng)",
                "RAM": "16GB LPDDR5 5200MHz",
                "SSD": "512GB SSD M.2 PCIe",
                "Màn hình": "14 inch WUXGA OLED 100% DCI-P3",
                "Trọng lượng": "1.46 kg",
                "Bảo hành": "24 tháng Premium Care",
            },
            "description": "Thiết kế vỏ kim loại trang nhã, màn hình OLED chuẩn màu và cấu hình mạnh mẽ cho công việc hàng ngày.",
            "is_active": True,
        },

        # ==========================================
        # 2. ĐIỆN THOẠI (15 SẢN PHẨM)
        # ==========================================
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 16 Pro Max 256GB Titan Sa Mạc",
            "slug": "iphone-16-pro-max-256gb-titan-sa-mac",
            "sku": "PHN-AP-IP16PM-256",
            "brand": "Apple",
            "price": 36990000,
            "sale_price": 34490000,
            "stock": 35,
            "thumbnail_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            "images": [
                "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            ],
            "specifications": {
                "Màn hình": "6.9 inch Super Retina XDR OLED 120Hz ProMotion",
                "Chipset": "Apple A18 Pro (3nm thế hệ mới)",
                "Bộ nhớ trong": "256GB NVMe",
                "Camera": "48MP Fusion + 48MP Ultra Wide + 12MP Tele 5x",
                "Pin": "4685 mAh (Hỗ trợ sạc MagSafe 25W)",
                "Bảo hành": "12 tháng chính hãng VN/A",
            },
            "description": "Flagship đỉnh nhất của Apple năm 2024: Màn hình lớn nhất 6.9 inch viền mỏng kỷ lục, nút Camera Control thế hệ mới.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 16 Pro 128GB Titan Tự Nhiên",
            "slug": "iphone-16-pro-128gb-titan-tu-nhien",
            "sku": "PHN-AP-IP16P-128",
            "brand": "Apple",
            "price": 29990000,
            "sale_price": 27990000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",
            "images": [
                "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",
            ],
            "specifications": {
                "Màn hình": "6.3 inch Super Retina XDR OLED 120Hz ProMotion",
                "Chipset": "Apple A18 Pro",
                "Bộ nhớ trong": "128GB",
                "Camera": "48MP + 48MP + 12MP Telephoto 5x",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Kích thước 6.3 inch vừa vặn hoàn hảo trong lòng bàn tay cùng cụm camera Telephoto 5x zoom quang học.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 16 Plus 128GB Xanh Lưu Ly",
            "slug": "iphone-16-plus-128gb-xanh-luu-ly",
            "sku": "PHN-AP-IP16PLUS-128",
            "brand": "Apple",
            "price": 26990000,
            "sale_price": 24990000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800",
            "images": [
                "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800",
            ],
            "specifications": {
                "Màn hình": "6.7 inch Super Retina XDR OLED",
                "Chipset": "Apple A18",
                "Bộ nhớ": "128GB",
                "Camera": "48MP Fusion 2-in-1",
                "Pin": "4674 mAh (Pin siêu trâu tới 27 giờ video)",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Màu sắc pha màu độc đáo mặt lưng kính mờ, thời lượng pin dẫn đầu toàn bộ dòng iPhone.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 15 Pro Max 256GB Titan Xanh",
            "slug": "iphone-15-pro-max-256gb-titan-xanh",
            "sku": "PHN-AP-IP15PM-256",
            "brand": "Apple",
            "price": 30990000,
            "sale_price": 28490000,
            "stock": 30,
            "thumbnail_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            "images": [
                "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            ],
            "specifications": {
                "Màn hình": "6.7 inch Super Retina XDR OLED 120Hz ProMotion",
                "Chipset": "Apple A17 Pro (3nm)",
                "Bộ nhớ trong": "256GB",
                "Camera": "48MP + 12MP + 12MP (Zoom quang 5x)",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Khung viền titan chuẩn hàng không vũ trụ siêu nhẹ và bền bỉ, cổng USB-C truyền dữ liệu 10Gbps tốc độ cao.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 15 128GB Hồng Pastel",
            "slug": "iphone-15-128gb-hong-pastel",
            "sku": "PHN-AP-IP15-128",
            "brand": "Apple",
            "price": 20490000,
            "sale_price": 18990000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800",
            "images": [
                "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800",
            ],
            "specifications": {
                "Màn hình": "6.1 inch Super Retina XDR OLED Dynamic Island",
                "Chipset": "Apple A16 Bionic",
                "Bộ nhớ trong": "128GB",
                "Camera": "48MP góc rộng + 12MP góc siêu rộng",
                "Bảo hành": "12 tháng",
            },
            "description": "Tích hợp đảo Dynamic Island thông minh, camera 48MP chụp sắc nét gấp 4 lần thế hệ trước.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "iPhone 13 128GB Midnight Chính Hãng VN/A",
            "slug": "iphone-13-128gb-midnight",
            "sku": "PHN-AP-IP13-128",
            "brand": "Apple",
            "price": 14990000,
            "sale_price": 13490000,
            "stock": 40,
            "thumbnail_url": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",
            "images": [
                "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",
            ],
            "specifications": {
                "Màn hình": "6.1 inch Super Retina XDR OLED",
                "Chipset": "Apple A15 Bionic",
                "Bộ nhớ": "128GB",
                "Camera": "Kép 12MP chống rung dịch chuyển cảm biến",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Chiếc iPhone quốc dân với hiệu năng bền bỉ qua năm tháng, pin khỏe và mức giá cực kỳ hấp dẫn.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Samsung Galaxy S24 Ultra 5G (12GB/256GB) Titan Xám",
            "slug": "samsung-galaxy-s24-ultra-5g-256gb",
            "sku": "PHN-SS-S24U-256",
            "brand": "Samsung",
            "price": 31990000,
            "sale_price": 27990000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
            ],
            "specifications": {
                "Màn hình": "6.8 inch Dynamic AMOLED 2X 120Hz 2600 nits Corning Armor",
                "Chipset": "Snapdragon 8 Gen 3 for Galaxy",
                "RAM": "12GB",
                "Bộ nhớ": "256GB",
                "Bút S-Pen": "Tích hợp sẵn trong thân máy",
                "Camera": "200MP + 50MP + 12MP + 10MP (Zoom 100x)",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Kỷ nguyên Galaxy AI: Khoanh tròn để tìm kiếm, dịch trực tiếp cuộc gọi, camera 200MP bắt trọn màn đêm.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Samsung Galaxy S24+ 5G (12GB/256GB) Đen Cobalt",
            "slug": "samsung-galaxy-s24-plus-5g-256gb",
            "sku": "PHN-SS-S24P-256",
            "brand": "Samsung",
            "price": 23990000,
            "sale_price": 20490000,
            "stock": 18,
            "thumbnail_url": "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
            "images": [
                "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
            ],
            "specifications": {
                "Màn hình": "6.7 inch QHD+ Dynamic AMOLED 2X 120Hz",
                "Chipset": "Exynos 2400 (10 nhân)",
                "RAM": "12GB",
                "Bộ nhớ": "256GB",
                "Pin": "4900 mAh (Sạc nhanh 45W)",
                "Bảo hành": "12 tháng",
            },
            "description": "Nâng cấp độ phân giải màn hình 2K+ sắc nét, dung lượng pin lớn gần bằng bản Ultra.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Samsung Galaxy Z Fold5 5G (12GB/512GB) Kem",
            "slug": "samsung-galaxy-z-fold5-5g-512gb",
            "sku": "PHN-SS-ZFOLD5-512",
            "brand": "Samsung",
            "price": 38990000,
            "sale_price": 34990000,
            "stock": 12,
            "thumbnail_url": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
            "images": [
                "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
            ],
            "specifications": {
                "Màn hình chính": "7.6 inch Dynamic AMOLED 2X 120Hz",
                "Màn hình phụ": "6.2 inch AMOLED 120Hz",
                "Bản lề": "Flex Hinge gập không khe hở",
                "Chipset": "Snapdragon 8 Gen 2 for Galaxy",
                "Bảo hành": "12 tháng Samsung Care+",
            },
            "description": "Chiếc máy tính bảng thu nhỏ trong túi áo với bản lề Flex không kẽ hở, khả năng đa nhiệm 3 ứng dụng cùng lúc.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Samsung Galaxy Z Flip5 5G (8GB/256GB) Xanh Mint",
            "slug": "samsung-galaxy-z-flip5-5g-256gb",
            "sku": "PHN-SS-ZFLIP5-256",
            "brand": "Samsung",
            "price": 19990000,
            "sale_price": 16990000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
            "images": [
                "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
            ],
            "specifications": {
                "Màn hình ngoài": "Flex Window 3.4 inch đa năng",
                "Màn hình chính": "6.7 inch FHD+ Dynamic AMOLED 2X 120Hz",
                "Chipset": "Snapdragon 8 Gen 2 for Galaxy",
                "Bảo hành": "12 tháng",
            },
            "description": "Màn hình ngoài Flex Window 3.4 inch độc đáo, chụp ảnh selfie góc rộng không cần chân đế.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Samsung Galaxy A55 5G (8GB/128GB) Xanh Iceblue",
            "slug": "samsung-galaxy-a55-5g-128gb",
            "sku": "PHN-SS-A55-128",
            "brand": "Samsung",
            "price": 9990000,
            "sale_price": 8990000,
            "stock": 35,
            "thumbnail_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
            ],
            "specifications": {
                "Màn hình": "6.6 inch Super AMOLED 120Hz Vision Booster",
                "Khung viền": "Kim loại cao cấp nguyên khối",
                "Chipset": "Exynos 1480 (GPU AMD Xclipse 530)",
                "Pin": "5000 mAh (Kháng nước IP67)",
                "Bảo hành": "12 tháng",
            },
            "description": "Vua tầm trung với khung viền kim loại sang trọng, kính cường lực Gorilla Glass Victus+ và kháng nước chuẩn IP67.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Xiaomi 14 Ultra 5G (16GB/512GB) Camera Leica",
            "slug": "xiaomi-14-ultra-5g-512gb",
            "sku": "PHN-MI-14ULTRA-512",
            "brand": "Xiaomi",
            "price": 31990000,
            "sale_price": 28990000,
            "stock": 14,
            "thumbnail_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
            "images": [
                "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
            ],
            "specifications": {
                "Màn hình": "6.73 inch LTPO AMOLED 2K+ 120Hz 3000 nits",
                "Ống kính": "Cụm 4 camera Leica 50MP cảm biến 1-inch LYT-900",
                "Chipset": "Snapdragon 8 Gen 3",
                "Pin": "5000 mAh (Sạc nhanh 90W, không dây 80W)",
                "Bảo hành": "18 tháng chính hãng",
            },
            "description": "Đỉnh cao nhiếp ảnh di động: Cảm biến 1-inch khẩu độ vô cấp f/1.63 - f/4.0 cùng chất màu Leica danh tiếng.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "Xiaomi 14 5G (12GB/256GB) Trắng Tinh Khôi",
            "slug": "xiaomi-14-5g-256gb",
            "sku": "PHN-MI-14-256",
            "brand": "Xiaomi",
            "price": 20990000,
            "sale_price": 18490000,
            "stock": 22,
            "thumbnail_url": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
            "images": [
                "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
            ],
            "specifications": {
                "Màn hình": "6.36 inch OLED 1.5K 120Hz viền mỏng 1.61mm",
                "Chipset": "Snapdragon 8 Gen 3 (4nm)",
                "Camera": "Hệ thống 3 camera Leica Summilux 50MP",
                "Bảo hành": "18 tháng chính hãng",
            },
            "description": "Flagship nhỏ gọn mạnh mẽ nhất, viền màn hình siêu mỏng, hiệu năng vượt trội với Snapdragon 8 Gen 3.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "OPPO Find N3 Flip (12GB/256GB) Vàng Ánh Kim",
            "slug": "oppo-find-n3-flip-256gb",
            "sku": "PHN-OP-FIND-N3FLIP",
            "brand": "OPPO",
            "price": 20490000,
            "sale_price": 17990000,
            "stock": 16,
            "thumbnail_url": "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
            "images": [
                "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
            ],
            "specifications": {
                "Màn hình ngoài": "3.26 inch dọc trực quan",
                "Màn hình chính": "6.8 inch LTPO AMOLED 120Hz gập không nếp",
                "Camera": "Hasselblad 50MP + 48MP + 32MP Telephoto",
                "Bảo hành": "12 tháng",
            },
            "description": "Điện thoại gập đầu tiên trên thế giới trang bị cụm 3 camera chuyên nghiệp hợp tác cùng Hasselblad.",
            "is_active": True,
        },
        {
            "category_slug": "dien-thoai",
            "name": "OPPO Reno11 Pro 5G (12GB/512GB) Trắng Ngọc Trai",
            "slug": "oppo-reno11-pro-5g-512gb",
            "sku": "PHN-OP-RENO11P-512",
            "brand": "OPPO",
            "price": 14490000,
            "sale_price": 12990000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
            "images": [
                "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
            ],
            "specifications": {
                "Màn hình": "6.7 inch cong 3D OLED 120Hz 1 tỷ màu",
                "Chipset": "MediaTek Dimensity 8200",
                "Camera chân dung": "32MP Telephoto Sony IMX709",
                "Sạc nhanh": "80W SuperVOOC (đầy pin trong 28 phút)",
                "Bảo hành": "12 tháng",
            },
            "description": "Chuyên gia chân dung thế hệ mới: Thiết kế mặt lưng kết cấu lụa satin ngọc trai tuyệt đẹp.",
            "is_active": True,
        },

        # ==========================================
        # 3. MÀN HÌNH (10 SẢN PHẨM)
        # ==========================================
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Dell UltraSharp U2724D 27 inch 2K IPS Black 120Hz",
            "slug": "man-hinh-dell-ultrasharp-u2724d-27-inch-2k",
            "sku": "MON-DELL-U2724D",
            "brand": "Dell",
            "price": 11490000,
            "sale_price": 10490000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "QHD 2K (2560 x 1440)",
                "Tấm nền": "IPS Black (Tương phản 2000:1)",
                "Tần số quét": "120Hz mượt mà",
                "Độ phủ màu": "100% sRGB, 98% DCI-P3 (Delta E < 2)",
                "Cổng kết nối": "Thunderbolt 4, DisplayPort 1.4, HDMI",
                "Bảo hành": "36 tháng đổi mới tận nơi",
            },
            "description": "Màn hình chuẩn đồ họa hàng đầu với tấm nền IPS Black cho màu đen sâu thẳm và tần số quét 120Hz bảo vệ mắt.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Dell UltraSharp U3223QE 32 inch 4K Hub USB-C IPS Black",
            "slug": "man-hinh-dell-ultrasharp-u3223qe-32-inch-4k",
            "sku": "MON-DELL-U3223QE",
            "brand": "Dell",
            "price": 20990000,
            "sale_price": 18990000,
            "stock": 10,
            "thumbnail_url": "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            "images": [
                "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            ],
            "specifications": {
                "Kích thước": "31.5 inch",
                "Độ phân giải": "4K UHD (3840 x 2160)",
                "Tấm nền": "IPS Black 400 nits HDR400",
                "Hub kết nối": "USB-C 90W sạc laptop, RJ45 LAN, KVM switch",
                "Bảo hành": "36 tháng chính hãng",
            },
            "description": "Màn hình 32 inch 4K kiêm Hub kết nối toàn diện: Cắm 1 cáp Type-C sạc laptop, xuất hình và nối mạng LAN tức thì.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Dell S2722QC 27 inch 4K IPS Type-C 65W",
            "slug": "man-hinh-dell-s2722qc-27-inch-4k-type-c",
            "sku": "MON-DELL-S2722QC",
            "brand": "Dell",
            "price": 8990000,
            "sale_price": 7990000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "4K UHD (3840 x 2160)",
                "Tấm nền": "IPS chống chói sRGB 99%",
                "Cổng kết nối": "USB-C PD 65W, 2x HDMI 2.0, Loa kép tích hợp",
                "Bảo hành": "36 tháng",
            },
            "description": "Màn hình 4K sắc nét tích hợp cổng Type-C và loa ngoài tiện lợi, thiết kế mặt lưng họa tiết xám bạch kim hiện đại.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Gaming Dell G2724D 27 inch 2K Fast IPS 165Hz",
            "slug": "man-hinh-gaming-dell-g2724d-27-inch-2k-165hz",
            "sku": "MON-DELL-G2724D",
            "brand": "Dell",
            "price": 7690000,
            "sale_price": 6890000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800",
            "images": [
                "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "QHD 2K (2560 x 1440)",
                "Tần số quét": "165Hz (Thời gian phản hồi 1ms GtG)",
                "Đồng bộ": "NVIDIA G-Sync Compatible & AMD FreeSync Premium",
                "Bảo hành": "36 tháng",
            },
            "description": "Chiến thần gaming phân khúc 2K: Tấm nền Fast IPS siêu tốc, chuẩn màu 99% sRGB không bóng ma.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Gaming LG UltraGear 27GR75Q 27 inch 2K 165Hz 1ms",
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
                "Công nghệ": "HDR10, sRGB 99%, G-Sync Compatible",
                "Bảo hành": "24 tháng chính hãng",
            },
            "description": "Dòng màn hình gaming quốc dân từ LG: Hình ảnh mượt mà, chuyển động chuẩn xác cho game thủ eSports.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Cong LG UltraGear 34GP63A 34 inch WQHD 160Hz",
            "slug": "man-hinh-cong-lg-ultragear-34gp63a-34-inch",
            "sku": "MON-LG-34GP63A",
            "brand": "LG",
            "price": 10990000,
            "sale_price": 9490000,
            "stock": 14,
            "thumbnail_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            ],
            "specifications": {
                "Kích thước": "34 inch Tỷ lệ 21:9 UltraWide",
                "Độ phân giải": "UltraWide QHD (3440 x 1440)",
                "Độ cong": "1800R bao quát tầm mắt",
                "Tần số quét": "160Hz 1ms MBR",
                "Bảo hành": "24 tháng",
            },
            "description": "Không gian hiển thị siêu rộng tỷ lệ 21:9 chuẩn rạp phim, mở rộng góc nhìn trong game bắn súng và đua xe.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình LG 27UP850N 27 inch 4K UHD DCI-P3 95% USB-C 90W",
            "slug": "man-hinh-lg-27up850n-27-inch-4k-uhd",
            "sku": "MON-LG-27UP850N",
            "brand": "LG",
            "price": 9490000,
            "sale_price": 8290000,
            "stock": 20,
            "thumbnail_url": "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            "images": [
                "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "4K UHD (3840 x 2160)",
                "Tấm nền": "IPS DCI-P3 95% VESA DisplayHDR 400",
                "Cổng kết nối": "USB-C sạc 90W, Loa MaxxAudio 5W",
                "Bảo hành": "24 tháng",
            },
            "description": "Chuẩn mực đồ họa và sáng tạo nội dung trên macOS & Windows, hỗ trợ phần mềm cân màu phần cứng True Color Pro.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Gaming Samsung Odyssey G7 28 inch 4K IPS 144Hz 1ms",
            "slug": "man-hinh-samsung-odyssey-g7-28-inch-4k-144hz",
            "sku": "MON-SS-ODYS-G7",
            "brand": "Samsung",
            "price": 14490000,
            "sale_price": 12490000,
            "stock": 16,
            "thumbnail_url": "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800",
            "images": [
                "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800",
            ],
            "specifications": {
                "Kích thước": "28 inch",
                "Độ phân giải": "4K UHD (3840 x 2160)",
                "Tấm nền": "IPS 144Hz 1ms VESA DisplayHDR 400",
                "Hệ điều hành": "Tizen Smart TV (YouTube, Netflix độc lập)",
                "Bảo hành": "24 tháng",
            },
            "description": "Vừa là màn hình gaming 4K 144Hz đỉnh cao cho PC và PS5, vừa là Smart TV thông minh giải trí độc lập.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Đồ Họa Samsung ViewFinity S9 27 inch 5K Chống Chói",
            "slug": "man-hinh-samsung-viewfinity-s9-27-inch-5k",
            "sku": "MON-SS-VF-S9",
            "brand": "Samsung",
            "price": 28990000,
            "sale_price": 24990000,
            "stock": 8,
            "thumbnail_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "5K (5120 x 2880) 218 PPI siêu mịn",
                "Mặt kính": "Matte Display chống lóa hoàn hảo",
                "Camera": "SlimFit 4K tích hợp",
                "Độ chuẩn màu": "99% DCI-P3 (Delta E < 2)",
                "Cổng kết nối": "Thunderbolt 4 (90W), Mini DisplayPort",
                "Bảo hành": "24 tháng chính hãng",
            },
            "description": "Đối thủ xứng tầm của Apple Studio Display với độ phân giải 5K, mặt kính nhám chống chói và webcam 4K sắc nét.",
            "is_active": True,
        },
        {
            "category_slug": "man-hinh",
            "name": "Màn hình Chuyên Đồ Họa ASUS ProArt PA278CV 27 inch 2K 100% sRGB",
            "slug": "man-hinh-asus-proart-pa278cv-27-inch-2k",
            "sku": "MON-ASUS-PA278CV",
            "brand": "ASUS",
            "price": 8690000,
            "sale_price": 7790000,
            "stock": 24,
            "thumbnail_url": "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            "images": [
                "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800",
            ],
            "specifications": {
                "Kích thước": "27 inch",
                "Độ phân giải": "2K WQHD (2560 x 1440)",
                "Tấm nền": "IPS 75Hz Calman Verified (Delta E < 2)",
                "Độ phủ màu": "100% sRGB, 100% Rec. 709",
                "Cổng kết nối": "USB-C 65W, DisplayPort Daisy-chain, HDMI",
                "Bảo hành": "36 tháng ProArt",
            },
            "description": "Chứng nhận kiểm định màu Calman Verified quốc tế, thước đo ảo QuickFit Virtual Scale độc quyền hỗ trợ designer in ấn.",
            "is_active": True,
        },

        # ==========================================
        # 4. PHỤ KIỆN (10 SẢN PHẨM)
        # ==========================================
        {
            "category_slug": "phu-kien",
            "name": "Chuột không dây Logitech MX Master 3S Darkfield 8000 DPI",
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
                "Cảm biến": "Darkfield 8000 DPI (Di trên mọi mặt phẳng kính)",
                "Kết nối": "Bluetooth & Logi Bolt USB",
                "Nút cuộn": "MagSpeed siêu tốc cuộn 1000 dòng/giây",
                "Âm thanh": "Quiet Clicks giảm 90% tiếng ồn",
                "Thời lượng pin": "Lên tới 70 ngày",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Biểu tượng chuột công thái học cao cấp cho lập trình viên, designer và dân văn phòng toàn cầu.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Chuột Gaming Siêu Nhẹ Logitech G Pro X Superlight 2 Hero 2",
            "slug": "chuot-gaming-logitech-g-pro-x-superlight-2",
            "sku": "ACC-LOGI-GPX2",
            "brand": "Logitech",
            "price": 3890000,
            "sale_price": 3490000,
            "stock": 35,
            "thumbnail_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
            ],
            "specifications": {
                "Trọng lượng": "Siêu nhẹ chỉ 60g",
                "Cảm biến": "HERO 2 32.000 DPI, 500+ IPS",
                "Tần số phản hồi": "LIGHTSPEED 2000Hz (0.5ms)",
                "Switch": "Lai cơ học - quang học LIGHTFORCE",
                "Bảo hành": "24 tháng chính hãng",
            },
            "description": "Chuột eSports số 1 được các tuyển thủ chuyên nghiệp CS2 và Valorant tin dùng.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Bàn phím không dây cao cấp Logitech MX Keys S Smart Backlight",
            "slug": "ban-phim-logitech-mx-keys-s",
            "sku": "ACC-LOGI-MXKEYS-S",
            "brand": "Logitech",
            "price": 2890000,
            "sale_price": 2590000,
            "stock": 40,
            "thumbnail_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            "images": [
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            ],
            "specifications": {
                "Phím": "Perfect Stroke lõm ôm đầu ngón tay",
                "Đèn nền": "Smart Illumination tự sáng khi tay lại gần",
                "Tính năng": "Smart Actions tự động hóa tác vụ",
                "Kết nối": "Chuyển đổi 3 thiết bị qua Bluetooth/Bolt",
                "Bảo hành": "12 tháng",
            },
            "description": "Gõ phím êm ái, đầm tay và chính xác tuyệt đối, kết hợp hoàn hảo cùng chuột MX Master 3S.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Bàn phím cơ không dây Keychron K2 Pro QMK/VIA Hot-swap",
            "slug": "ban-phim-co-keychron-k2-pro",
            "sku": "ACC-KEY-K2PRO",
            "brand": "Keychron",
            "price": 2290000,
            "sale_price": 1990000,
            "stock": 45,
            "thumbnail_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            "images": [
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            ],
            "specifications": {
                "Layout": "75% (84 phím gọn gàng)",
                "Switch": "Keychron K Pro Red / Brown (Lube sẵn)",
                "Hot-swap": "Hỗ trợ thay switch nóng 3-pin & 5-pin",
                "Keycap": "PBT Double-shot OSA Profile",
                "Tùy biến": "Hỗ trợ phần mềm QMK/VIA đầy đủ",
                "Bảo hành": "12 tháng",
            },
            "description": "Bàn phím cơ tuỳ biến không giới hạn với phần mềm QMK/VIA, switch êm ái cùng keycap PBT bền bỉ.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Bàn phím cơ Custom Nhôm CNC Keychron Q1 Pro Wireless",
            "slug": "ban-phim-co-keychron-q1-pro-wireless",
            "sku": "ACC-KEY-Q1PRO",
            "brand": "Keychron",
            "price": 4790000,
            "sale_price": 4290000,
            "stock": 18,
            "thumbnail_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            "images": [
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            ],
            "specifications": {
                "Khung": "Nhôm nguyên khối 6063 CNC anodized",
                "Cấu trúc": "Double-Gasket Design cho âm gõ trầm ấm",
                "Kết nối": "Bluetooth 5.1 & Dây cáp Type-C",
                "Knob": "Núm xoay đa năng kim loại điều chỉnh âm lượng",
                "Bảo hành": "12 tháng",
            },
            "description": "Trải nghiệm gõ phím custom cao cấp nhất: Vỏ nhôm nặng 1.8kg đầm chắc, âm gõ creamy tuyệt hảo.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Chuột Gaming Không Dây Razer DeathAdder V3 Pro 30K DPI",
            "slug": "chuot-gaming-razer-deathadder-v3-pro",
            "sku": "ACC-RAZER-DAV3P",
            "brand": "Razer",
            "price": 3290000,
            "sale_price": 2890000,
            "stock": 30,
            "thumbnail_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
            "images": [
                "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
            ],
            "specifications": {
                "Thiết kế": "Công thái học chuyên biệt cho tay phải (63g)",
                "Cảm biến": "Quang học Focus Pro 30K DPI",
                "Switch": "Optical Mouse Switches Gen-3 90 triệu lần bấm",
                "Pin": "Lên tới 90 giờ hoạt động liên tục",
                "Bảo hành": "24 tháng chính hãng",
            },
            "description": "Huyền thoại công thái học tái sinh: Cảm giác cầm nắm ôm tay tuyệt đối và độ trễ gần như bằng 0.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Tai nghe Chống ồn Không dây Sony WH-1000XM5 Hi-Res",
            "slug": "tai-nghe-sony-wh-1000xm5",
            "sku": "ACC-SONY-WH1000XM5",
            "brand": "Sony",
            "price": 7990000,
            "sale_price": 6790000,
            "stock": 25,
            "thumbnail_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
            ],
            "specifications": {
                "Chống ồn": "Hệ thống 8 micro và 2 bộ xử lý chuyên dụng V1/QN1",
                "Âm thanh": "Hi-Res Audio Wireless, codec LDAC chất lượng cao",
                "Đàm thoại": "4 micro định chùm sóng lọc gió AI",
                "Pin": "30 giờ (Sạc nhanh 3 phút nghe được 3 giờ)",
                "Bảo hành": "12 tháng chính hãng Sony VN",
            },
            "description": "Vua chống ồn chủ động thế giới với thiết kế quai đeo thanh mảnh êm ái, âm bass uy lực và chi tiết đỉnh cao.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Tai nghe Bluetooth Apple AirPods Pro 2 MagSafe (USB-C)",
            "slug": "tai-nghe-apple-airpods-pro-2-usb-c",
            "sku": "ACC-AP-APP2-USBC",
            "brand": "Apple",
            "price": 5990000,
            "sale_price": 5390000,
            "stock": 45,
            "thumbnail_url": "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800",
            "images": [
                "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800",
            ],
            "specifications": {
                "Chip": "Apple H2 cho chất âm sống động và chống ồn gấp đôi",
                "Chế độ": "Adaptive Audio tự động chuyển đổi thông minh",
                "Cổng sạc": "Hộp sạc USB-C có loa định vị Find My và chống nước IP54",
                "Thời lượng pin": "6 giờ (kèm hộp sạc lên tới 30 giờ)",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Tai nghe True Wireless hoàn hảo nhất cho hệ sinh thái Apple: Chống ồn chủ động thông minh và âm thanh không gian Spatial Audio.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Tai nghe Chụp tai Apple AirPods Max (USB-C) Space Gray",
            "slug": "tai-nghe-apple-airpods-max-usb-c",
            "sku": "ACC-AP-APMAX-USBC",
            "brand": "Apple",
            "price": 13990000,
            "sale_price": 12990000,
            "stock": 15,
            "thumbnail_url": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800",
            "images": [
                "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800",
            ],
            "specifications": {
                "Chất liệu": "Chụp tai nhôm Anodized, đệm tai dạng lưới thoáng khí",
                "Chip": "2 chip Apple H1 riêng biệt mỗi bên tai nghe",
                "Âm thanh": "Driver dynamic do Apple thiết kế tái tạo âm thanh chuẩn phòng thu",
                "Cổng kết nối": "Cổng sạc USB-C thế hệ mới",
                "Bảo hành": "12 tháng chính hãng",
            },
            "description": "Kiệt tác âm thanh phòng thu: Độ chi tiết đáng kinh ngạc, chất liệu nhôm sang trọng và chống ồn chủ động xuất sắc.",
            "is_active": True,
        },
        {
            "category_slug": "phu-kien",
            "name": "Tai nghe Không Dây Marshall Major IV Bluetooth 80h Pin",
            "slug": "tai-nghe-marshall-major-iv-bluetooth",
            "sku": "ACC-MAR-MAJOR4",
            "brand": "Marshall",
            "price": 3490000,
            "sale_price": 2990000,
            "stock": 35,
            "thumbnail_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
            ],
            "specifications": {
                "Thời lượng pin": "Hơn 80 giờ chơi nhạc không dây",
                "Sạc nhanh": "15 phút sạc cho 15 giờ nghe (Hỗ trợ sạc không dây)",
                "Điều khiển": "Núm xoay đa hướng kim loại cổ điển",
                "Chất âm": "Âm thanh Marshall Signature bùng nổ",
                "Bảo hành": "12 tháng",
            },
            "description": "Phong cách Rock'n'Roll biểu tượng từ Marshall: Thời lượng pin kỷ lục 80 giờ và thiết kế gập gọn cổ điển.",
            "is_active": True,
        },
    ]

    for item in products_data:
        cat = category_map.get(item["category_slug"])
        if not cat:
            print(f"[Product Warning] Category '{item['category_slug']}' not found. Skipping {item['sku']}.")
            continue

        prod = db.query(Product).filter(
            (Product.sku == item["sku"]) | (Product.slug == item["slug"])
        ).first()
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
