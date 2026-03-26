# 00 - Project Initialization & Environment Setup (Vite Edition)

## 1. Core Tech Stack
- **Backend:** NestJS (v10+) - Module-based Architecture.
- **Frontend:** React + Vite (Template: react-ts).
- **Styling:** Tailwind CSS + PostCSS.
- **Database:** MongoDB (Mongoose ODM).
- **Language:** TypeScript (Strict mode).

## 2. Directory Structure
- `/docs`: Chứa tài liệu hướng dẫn chia theo module.
- `/source-code/backend`: Mã nguồn NestJS.
- `/source-code/frontend`: Mã nguồn React Vite.
- **`SYSTEM_ARCHITECTURE.md`** (thư mục gốc repo): ảnh chụp kiến trúc **backend + frontend** và bản đồ API/file chính — nên đọc khi đồng bộ tài liệu với code.

## 3. Port & API Configuration
- **Backend Port:** 3001
- **Frontend Port:** 5173 (Vite Default)
- **API Prefix:** `/api`
- **Swagger UI:** `/api/docs`
- **AI backend:** xem `source-code/backend/.env.example` — `GROQ_API_KEY` (ưu tiên) hoặc `GEMINI_API_KEY`; chi tiết `docs/02-backend/ai-engine-module/readme.md`.

## 4. Initialization Checklist for AI
### Step 1: Backend Setup (NestJS)
- Khởi tạo project NestJS dùng lệnh: `nest new . --directory .`.
- Cài đặt dependencies: `@nestjs/mongoose`, `mongoose`, `class-validator`, `class-transformer`, `@nestjs/swagger`, `@nestjs/config`.
- Cấu hình `main.ts`:
  - Port: 3001.
  - Global Prefix: `api`.
  - Enable ValidationPipe.
  - Setup Swagger UI.

### Step 2: Frontend Setup (Vite)
- Khởi tạo project Vite dùng lệnh: `npm create vite@latest . -- --template react-ts`.
- Cài đặt Tailwind CSS theo chuẩn Vite (Tailwind, PostCSS, Autoprefixer).
- Khởi tạo `tailwind.config.js` và thêm directive vào `src/index.css`.
- Cấu hình `vite.config.ts` để proxy các yêu cầu `/api` sang `http://localhost:3001`.

### Step 3: Global Config
- Tạo file `.env` mẫu cho cả 2 bên.
- Thiết lập `.gitignore` để bỏ qua `node_modules`, `dist`, `.env`.