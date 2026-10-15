# PROJECT CONTEXT & ARCHITECTURE RULES (AGENT.md)

## 1. Project Overview
A lightweight E-commerce web application with an Admin Dashboard (product/category/order management) and a Client Storefront (browsing, cart, checkout).

## 2. Tech Stack & Libraries
### Infrastructure
- **Database:** MySQL 8.0 (running via Docker on host port `3307` -> container port `3306` to avoid local port conflict).
- **DB Management UI:** phpMyAdmin (running via Docker on host port `8080`).

### Backend (`/backend`)
- **Framework:** FastAPI (Python 3.10+)
- **ORM & Migrations:** SQLAlchemy 2.0 (DeclarativeBase, synchronous `Session` with `pymysql` driver) + Alembic.
- **Validation & Settings:** Pydantic v2 (`pydantic`, `pydantic-settings`).
- **Media Storage:** Cloudinary (`cloudinary` Python SDK).
- **CORS:** Configured to allow requests from the Vite frontend (`http://localhost:5173`).

### Frontend (`/frontend`)
- **Framework:** React 18 + Vite + TypeScript (`.tsx`).
- **UI Library:** Ant Design (`antd` v5) + `@ant-design/icons`.
- **Routing:** `react-router-dom` v6.
- **HTTP Client:** `axios` (centralized instance with base URL configuration).
- **State Management:** `zustand` (specifically for Cart management with `localStorage` persistence).

## 3. Monorepo Directory Structure
Strictly follow this folder structure. Do NOT create files outside their designated directories:

```text
/
├── AGENT.md
├── docker-compose.yml
├── backend/
│   ├── alembic/
│   ├── alembic.ini
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       └── router.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── crud/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── database.py
│   │   └── main.py
│   ├── .env.example
│   ├── .env
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── layouts/
    │   │   ├── AdminLayout.tsx
    │   │   └── StoreLayout.tsx
    │   ├── pages/
    │   │   ├── admin/
    │   │   └── client/
    │   ├── routes/
    │   ├── store/
    │   ├── types/
    │   ├── App.tsx
    │   └── main.tsx
    ├── .env.example
    ├── .env
    ├── package.json
    └── tsconfig.json
```

## 4. Coding Conventions & Rules for AI Agent
1. **Separation of Concerns (Backend):**
   - `endpoints/`: Only handle HTTP requests, status codes, and dependency injection (`Depends(get_db)`).
   - `crud/`: Handle database queries using SQLAlchemy.
   - `schemas/`: Define strict Pydantic v2 models (`model_config = ConfigDict(from_attributes=True)`).
   - `services/`: Handle external integrations (e.g., Cloudinary upload logic).
2. **Database Connection:**
   - Default local connection URL for backend `.env`: `mysql+pymysql://ecom_user:ecom_password@127.0.0.1:3307/ecommerce_db`  
3. **Frontend Standards:**
   - All API calls must go through `src/api/axiosClient.ts`.
   - Use TypeScript interfaces (`src/types/`) matching Backend Pydantic schemas. Never use `any` unless strictly unavoidable.
   - Use Ant Design components (`Table`, `Form`, `Modal`, `Upload`, `Card`, `Drawer`, `message`, `notification`) consistently.
4. **Incremental Development:**
   - Only implement the exact scope requested in the prompt. Do not generate placeholder files for future phases unless instructed.