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
   *Nội dung mặc định trong `.env`:*
   ```env
   DATABASE_URL=mysql+pymysql://ecom_user:ecom_password@127.0.0.1:3307/ecommerce_db
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

5. Khởi động server Backend:
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
   VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
   ```

4. Chạy dev server:
   ```powershell
   npm run dev
   ```
   Frontend sẽ khởi chạy tại: `http://localhost:5173`

---

## 🌐 Danh sách URL & Cổng dịch vụ

| Dịch vụ | URL | Mô tả |
| :--- | :--- | :--- |
| **Client Storefront** | [http://localhost:5173](http://localhost:5173) | Giao diện mua sắm & Health Check hệ thống |
| **Admin Portal** | [http://localhost:5173/admin](http://localhost:5173/admin) | Giao diện quản trị (Sidebar Ant Design) |
| **Backend API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Swagger UI tài liệu hóa API tự động |
| **API Health Check** | [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) | Kiểm tra kết nối Backend và MySQL Database |
| **phpMyAdmin** | [http://localhost:8080](http://localhost:8080) | Giao diện quản lý Database trực quan |

### Thông tin đăng nhập mặc định:
- **phpMyAdmin / MySQL:**
  - **Server (nếu hỏi):** `mysql`
  - **Username:** `ecom_user` (hoặc `root`)
  - **Password:** `ecom_password` (hoặc `root_password`)
  - **Database name:** `ecommerce_db`
  - **Host Port trên máy host:** `3307`

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
