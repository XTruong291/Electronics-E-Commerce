# 🛒 E-Commerce Web Application

Dự án ứng dụng web thương mại điện tử hiện đại theo mô hình Monorepo, bao gồm **Client Storefront** (mua sắm dành cho khách hàng) và **Admin Portal** (quản lý sản phẩm, danh mục, đơn hàng dành cho quản trị viên).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### 1. Hạ tầng & Cơ sở dữ liệu (Infrastructure)
- **Database:** MySQL 8.0 (chạy trong Docker, ánh xạ cổng host `3307:3306` để tránh xung đột cổng mặc định `3306`).
- **Database UI:** phpMyAdmin (cổng host `8080`).

### 2. Backend (`/backend`)
- **Framework:** FastAPI (Python 3.11+)
- **ORM & Migrations:** SQLAlchemy 2.0 (`DeclarativeBase`, synchronous session với driver `pymysql`) + Alembic
- **Validation & Cấu hình:** Pydantic v2 + `pydantic-settings`
- **Lưu trữ hình ảnh:** Cloudinary SDK

### 3. Frontend (`/frontend`)
- **Framework:** React 18 + Vite + TypeScript (`.tsx`)
- **UI Library:** Ant Design (v5) + `@ant-design/icons`
- **Routing:** React Router DOM (v6)
- **HTTP Client:** Axios (cấu hình centralized instance)
- **State Management:** Zustand

---

## 📁 Cấu trúc thư mục (Monorepo)

```text
Project_LTW/
├── AGENT.md               # Quy ước kiến trúc và quy tắc dự án
├── README.md              # Tài liệu giới thiệu và hướng dẫn chạy
├── docker-compose.yml     # Quản lý container MySQL 8.0 & phpMyAdmin
├── .gitignore             # Git ignore cho Python, Node, và môi trường
│
├── backend/               # Mã nguồn Backend (FastAPI)
│   ├── alembic/           # Cấu hình migration database
│   ├── alembic.ini
│   ├── app/
│   │   ├── api/v1/        # API Routers & Endpoints
│   │   ├── core/          # Cấu hình cài đặt (pydantic-settings)
│   │   ├── crud/          # Database queries
│   │   ├── models/        # SQLAlchemy Models
│   │   ├── schemas/       # Pydantic Schemas
│   │   ├── services/      # External Services (Cloudinary, v.v.)
│   │   ├── database.py    # Engine & SessionLocal
│   │   └── main.py        # FastAPI entrypoint & CORS
│   ├── .env.example
│   ├── .env
│   └── requirements.txt
│
└── frontend/              # Mã nguồn Frontend (React + Vite + TS)
    ├── src/
    │   ├── api/           # Axios client instance
    │   ├── layouts/       # StoreLayout (Client) & AdminLayout (Sidebar)
    │   ├── pages/         # Client & Admin pages
    │   ├── store/         # Zustand stores
    │   ├── types/         # TypeScript types / interfaces
    │   ├── App.tsx        # Router setup
    │   └── main.tsx
    ├── .env.example
    ├── .env
    └── package.json
```

---

## 🚀 Hướng dẫn cài đặt và khởi chạy

### Yêu cầu tiên quyết (Prerequisites)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã được cài đặt và đang chạy.
- [Python](https://www.python.org/) >= 3.10
- [Node.js](https://nodejs.org/) >= 18.x và npm

---

### Bước 1: Khởi động Database (MySQL & phpMyAdmin)

Tại thư mục gốc của dự án, mở Terminal / PowerShell và chạy:

```powershell
docker compose up -d
```

Kiểm tra trạng thái container:
```powershell
docker compose ps
```
> Khi container `ecommerce_mysql` báo `Up (healthy)`, cơ sở dữ liệu đã sẵn sàng kết nối qua cổng `3307`.

---

### Bước 2: Cài đặt và khởi chạy Backend (FastAPI)

1. Di chuyển vào thư mục backend:
   ```powershell
   cd backend
   ```

2. Tạo và kích hoạt môi trường ảo Python (Virtual Environment):
   - **Windows:**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Cài đặt các thư viện cần thiết:
   ```powershell
   pip install -r requirements.txt
   ```

4. Cấu hình biến môi trường (nếu chưa có file `.env`):
   ```powershell
   # Nhân bản từ file mẫu:
   Copy-Item .env.example .env
   ```
   *Nội dung mẫu trong `backend/.env`:*
   ```env
   DATABASE_URL=mysql+pymysql://ecom_user:ecom_password@127.0.0.1:3307/ecommerce_db
   SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7

   # OAuth SSO
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   FRONTEND_URL=http://localhost:5173

   # Cloudinary (Quản lý avatar người dùng & hình ảnh)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

5. Chạy Migration Database (Alembic):
   ```powershell
   alembic upgrade head
   ```

6. Seed dữ liệu tài khoản mẫu (ADMIN, STAFF, CUSTOMER):
   ```powershell
   python -m app.scripts.seed_users
   ```

7. Khởi động server Backend:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   Backend sẽ lắng nghe tại: `http://127.0.0.1:8000`

---

### Bước 3: Cài đặt và khởi chạy Frontend (React + Vite)

Mở một cửa sổ Terminal mới:

1. Di chuyển vào thư mục frontend:
   ```powershell
   cd frontend
   ```

2. Cài đặt các gói phụ thuộc (npm packages):
   ```powershell
   npm install
   ```

3. Cấu hình biến môi trường (nếu chưa có file `.env`):
   ```powershell
   Copy-Item .env.example .env
   ```
   *Nội dung trong `frontend/.env`:*
   ```env
   VITE_API_BASE_URL=/api/v1
   ```
   *(Sử dụng relative path `/api/v1` để tận dụng Vite proxy, tránh lỗi cross-origin đối với cookie HttpOnly)*.

4. Chạy dev server:
   ```powershell
   npm run dev
   ```
   Frontend sẽ khởi chạy tại: `http://localhost:5173`

---

## 👥 Tài khoản mặc định hệ thống (Seed Accounts)

Sau khi chạy lệnh `python -m app.scripts.seed_users`, hệ thống có sẵn 3 tài khoản thử nghiệm:

| Email | Mật khẩu | Vai trò (Role) | Quyền hạn truy cập |
| :--- | :--- | :--- | :--- |
| `admin@example.com` | `Admin@123456` | **ADMIN** | Toàn quyền Storefront & Admin Portal (quản lý phân quyền, khóa/mở tài khoản, v.v.) |
| `staff@example.com` | `Staff@123456` | **STAFF** | Truy cập Storefront & Admin Portal (quản lý nghiệp vụ, cập nhật đơn hàng) |
| `customer@example.com` | `Customer@123456` | **CUSTOMER** | Mua sắm tại Storefront, hồ sơ cá nhân, sổ địa chỉ. Bị chặn truy cập Admin Portal (403) |

---

## 🔐 Cấu hình Đăng nhập một chạm (Google & GitHub OAuth SSO)

### 1. Google OAuth 2.0 Setup
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Chọn **Create Credentials** -> **OAuth client ID** (Application type: *Web application*).
3. Thêm Authorized redirect URIs:
   ```text
   http://localhost:8000/api/v1/auth/sso/google/callback
   ```
4. Sao chép `Client ID` và `Client Secret` vào `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   ```

### 2. GitHub OAuth Setup
1. Truy cập [GitHub Developer Settings](https://github.com/settings/developers) -> **OAuth Apps** -> **New OAuth App**.
2. Thiết lập:
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:**
     ```text
     http://localhost:8000/api/v1/auth/sso/github/callback
     ```
3. Nhấn **Register application**, tạo Client Secret và lưu vào `backend/.env`:
   ```env
   GITHUB_CLIENT_ID=<your-github-client-id>
   GITHUB_CLIENT_SECRET=<your-github-client-secret>
   ```

### 3. Nguyên tắc liên kết tài khoản SSO (Identity Resolution):
- **Trường hợp A (Đã liên kết):** User đăng nhập qua SSO đã có bản ghi `OAuthAccount` tương ứng -> Cấp JWT & Refresh Token ngay lập tức.
- **Trường hợp B (Email trùng với tài khoản Local):** Nếu email trả về từ Provider đã được xác minh (`email_verified = True`), tự động liên kết provider vào tài khoản đó. Nếu email **chưa xác minh**, hệ thống lập tức từ chối liên kết để chống tấn công Account Takeover.
- **Trường hợp C (Người dùng mới):** Tự động tạo tài khoản mới với vai trò `CUSTOMER` và lưu liên kết `OAuthAccount`.

---

## 🛡️ Kiến trúc Bảo mật & RBAC

1. **Lưu trữ Token an toàn:**
   - **Access Token:** JWT ngắn hạn (15 phút), lưu hoàn toàn trong bộ nhớ RAM (`Zustand` store), tuyệt đối **không** lưu vào `localStorage` hay `sessionStorage` để triệt tiêu lỗ hổng XSS.
   - **Refresh Token:** Chuỗi ngẫu nhiên 64 ký tự (CSPRNG), chỉ lưu trong `HttpOnly`, `SameSite=Lax` Cookie.
   - **Lưu trữ Database:** Backend chỉ lưu chuỗi băm SHA-256 của Refresh Token, không lưu token gốc.
2. **Refresh Token Rotation & Tự động phát hiện tái sử dụng (Reuse Detection):**
   - Mỗi lần refresh token thành công, refresh token cũ bị thu hồi (`revoked = True`) và một refresh token mới được cấp.
   - Nếu phát hiện yêu cầu refresh sử dụng một token đã bị thu hồi, hệ thống kích hoạt cơ chế phòng thủ: **thu hồi toàn bộ mọi phiên đăng nhập của người dùng đó ngay lập tức**.
3. **Phân quyền Role-Based Access Control (RBAC):**
   - Chuỗi Dependency FastAPI: `get_current_user` -> `get_current_active_user` -> `require_roles(["ADMIN", "STAFF"])`.
   - UI Route Guard `<ProtectedRoute roles={[...]}>`: Điều hướng khách sang trang đăng nhập kèm query parameter `?redirect=...`, hiển thị màn hình 403 Result đẹp mắt đối với người dùng không đủ quyền.
4. **Bảo vệ an toàn Quản trị viên:**
   - Quản trị viên không thể tự khóa tài khoản của chính mình (`self-lock block`).
   - Quản trị viên không thể tự giáng chức chính mình khỏi quyền ADMIN (`self-demote block`).
   - Khi người dùng bị khóa hoặc đổi vai trò, toàn bộ các refresh token của người dùng đó bị hủy ngay lập tức.

---

## 🧪 Kiểm thử tự động (Automated Testing)

### 1. Backend Pytest Suite (27 tests)
Chạy toàn bộ 27 bài kiểm thử đơn vị và tích hợp cho Auth, RBAC, SSO Identity Resolution và User Management:

```powershell
cd backend
.\.venv\Scripts\pytest -v
```

### 2. Frontend Playwright E2E Tests (4 scenarios)
Bộ kiểm thử tự động End-to-End kiểm tra toàn bộ luồng đăng nhập, bảo vệ route, cơ chế làm mới phiên làm việc và phân quyền RBAC:

```powershell
cd frontend
npx playwright test
```

Các ca kiểm thử bao gồm:
1. `ADMIN can log in via classic form and manage users on /admin/users` (Đăng nhập form, phân quyền, quản lý danh sách & tìm kiếm user, kiểm tra silent refresh khi reload trang).
2. `SSO callback simulation loads profile and sets in-memory session` (Mô phỏng callback SSO, nạp thông tin user vào RAM store, chuyển hướng mượt mà).
3. `Guest navigating to /admin/users is redirected to /login with redirect query param` (Bảo vệ đường dẫn chưa xác thực).
4. `CUSTOMER role cannot open /admin/users (403 page) and PATCH /admin/orders/1/status returns 403` (Chặn UI 403 và chặn API cấp backend đối với vai trò CUSTOMER).

---

## 🌐 Danh sách URL & Cổng dịch vụ

| Dịch vụ | URL | Mô tả |
| :--- | :--- | :--- |
| **Client Storefront** | [http://localhost:5173](http://localhost:5173) | Giao diện mua sắm khách hàng, trang cá nhân `/profile` |
| **Admin Portal** | [http://localhost:5173/admin](http://localhost:5173/admin) | Giao diện quản trị, quản lý người dùng `/admin/users` |
| **Backend API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Swagger UI tài liệu hóa API tự động |
| **API Health Check** | [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) | Kiểm tra kết nối Backend và MySQL Database |
| **phpMyAdmin** | [http://localhost:8080](http://localhost:8080) | Giao diện quản lý Database trực quan |

---

## 🛠️ Một số lệnh hữu ích thường dùng

- **Dừng containers Docker:**
  ```powershell
  docker compose down
  ```
- **Kiểm tra trạng thái Alembic migrations:**
  ```powershell
  cd backend
  alembic current
  ```
- **Kiểm tra build Frontend:**
  ```powershell
  cd frontend
  npm run build
  ```
- **Chạy E2E tests với UI mode:**
  ```powershell
  cd frontend
  npx playwright test --ui
  ```
