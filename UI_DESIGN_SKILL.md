# FRONTEND UI/UX SKILL: VIETNAMESE TECH E-COMMERCE (FPT SHOP / CELLPHONES STYLE)

When asked to build, refactor, or optimize Frontend UI in `/frontend`, strictly apply the following domain-specific design rules for a Vietnamese electronics retailer website.

## 1. Theme & Color Tokens (Ant Design `ConfigProvider`)
- **Primary Brand Color:** `#cb1c22` (FPT Tech Red) or `#d70018` for CTAs, active tabs, and discount badges.
- **Page Background:** `#f3f4f6` (Light neutral gray — NEVER use pure white `#ffffff` for the main page layout background so white product cards stand out).
- **Card / Surface Background:** `#ffffff` with `border-radius: 12px`, subtle border `1px solid #e5e7eb`, and soft hover shadow `0 10px 20px rgba(0,0,0,0.08)`.
- **Price Typography:**
  - Sale/Final Price: `#d70018`, `font-weight: 700`, `font-size: 18px` (Card) or `26px` (Detail page).
  - Original Price: `#9ca3af`, `text-decoration: line-through`, `font-size: 13px`.
- **Container Width:** All client storefront content must sit inside a centered container (`max-width: 1240px`, `margin: 0 auto`, `padding: 0 16px`).

## 2. Header & Navigation (`StoreLayout.tsx`)
- **Sticky Top Header:** Brand red (`#cb1c22`) or dark tech navy (`#111827`) background with high-contrast white text/icons.
- **Components in Header:**
  1. Brand Logo + Category Dropdown Trigger button.
  2. Prominent rounded Search Bar (`max-width: 480px`) with placeholder *"Bạn cần tìm laptop, điện thoại, phụ kiện gì?..."*.
  3. Hotline/Order Lookup badge + Shopping Cart button (with prominent item count badge) + User Account menu.
- **Quick Category Sub-bar:** Below the main header, display a horizontal quick-navigation bar with icons for key categories (`Laptop`, `Điện thoại`, `Màn hình`, `Phụ kiện`, `Khuyến mãi`).

## 3. Product Card Anatomy (Electronics Standard)
Every product card in grids must include:
1. **Top Badges Row:** Left badge for Discount (`Giảm X%` in solid `#d70018` pill) and right badge for `Trả góp 0%` (light gray/blue outline pill).
2. **Product Image Box:** Fixed aspect ratio (`height: 190px`), `object-fit: contain`, `padding: 12px`, smooth zoom on hover (`transform: scale(1.04)` over `0.25s`).
3. **Product Title:** 2-line clamp (`display: -webkit-box; -webkit-line-clamp: 2`), `font-weight: 600`, `font-size: 15px`, `min-height: 44px`, hover color `#cb1c22`.
4. **Tech Specs Micro-Chips:** Extract 2-3 key values from `product.specifications` (e.g., CPU, RAM, SSD, Screen) and render them as compact gray badges (`background: #f3f4f6`, `color: #4b5563`, `font-size: 11px`, `padding: 2px 6px`, `border-radius: 4px`) right below the title.
5. **Price Block & Action:** Prominent red price, strikethrough original price, stock status indicator, and a clean "Thêm vào giỏ" / "Mua ngay" action bar.

## 4. Storefront Home Layout (`HomePage.tsx`)
- **2-Column Hero Section:** Left column (8/12 grid on desktop) with a rounded `Carousel` banner; Right column (4/12 grid) with 2 stacked promotional cards (e.g., "Laptop Gaming Giảm Sốc", "Đặc Quyền Sinh Viên").
- **Category Showcase Blocks:** Group or filter products inside styled sections (e.g., a "FLASH SALE / DEAL HOT" gradient red container, followed by clean white filterable catalog grid with Quick Brand Pills: `Apple`, `ASUS`, `Dell`, `Samsung`, `LG`, `Logitech`).

## 5. Product Detail Page (`ProductDetailPage.tsx`)
- **2-Column Upper Fold:**
  - Left (45%): Main high-res preview image (`border: 1px solid #f0f0f0`, `border-radius: 12px`) + horizontal thumbnail strip with active red border.
  - Right (55%): Title, SKU/Brand metadata, grey gradient price box, a **Promotions & Warranty Box** (bordered box with gift icon listing store perks: Bảo hành chính hãng, Giao hàng miễn phí, Đổi mới 30 ngày), Quantity selector, and dual CTA buttons:
    - Primary CTA: **MUA NGAY** (Large two-line red button: bold title + subtext *"Giao nhanh miễn phí hoặc nhận tại shop"*).
    - Secondary CTA: **THÊM VÀO GIỎ** (Red outline button with cart icon).
- **2-Column Lower Fold:**
  - Left (60%): Detailed product description inside a white card.
  - Right (40%): Sticky **Thông số kỹ thuật (`specifications`)** zebra-striped table (`#f9fafb` alternating rows) styled like FPT Shop.