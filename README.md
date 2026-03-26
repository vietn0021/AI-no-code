# AI No-code Game Studio

Ứng dụng **studio tạo game không cần code**: người dùng đăng ký/đăng nhập, quản lý dự án, chỉnh **game config** (JSON) qua **AI (Gemini)** và **editor trực quan** (preview, layers, asset mẫu, sprite), có **versioning / rollback** phía backend.

---

## Kiến trúc & tài liệu

| Tài liệu | Mô tả |
|----------|--------|
| [**SYSTEM_ARCHITECTURE.md**](./SYSTEM_ARCHITECTURE.md) | Bản đồ kiến trúc **full stack**: module backend, API, frontend Studio, entity/sprite, file tham chiếu. |
| [**docs/**](./docs/) | Đặc tả theo module: khởi tạo, system design, backend, frontend, testing. |

Gợi ý đọc nhanh: `docs/00-project-init/readme.md`, `docs/03-frontend/studio-editor/readme.md`, `docs/02-backend/auth-module/readme.md`.

---

## Cấu trúc thư mục

```txt
AI-no-code/
├── docs/                      # Tài liệu thiết kế & hướng dẫn
├── source-code/
│   ├── backend/               # NestJS API (port mặc định 3001)
│   └── frontend/              # React + Vite (port mặc định 5173)
├── SYSTEM_ARCHITECTURE.md     # Tóm tắt kiến trúc hệ thống
└── README.md                  # File này
```

---

## Yêu cầu môi trường

- **Node.js** (LTS khuyến nghị)
- **MongoDB** (Atlas hoặc local) — URI trong biến môi trường backend
- **Google Gemini API key** — cho generate game config (`GEMINI_API_KEY`)

---

## Chạy nhanh (development)

### Backend

```bash
cd source-code/backend
cp .env.example .env
# Chỉnh MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN; thêm GEMINI_API_KEY vào .env
npm install
npm run start:dev
```

- API: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/api/docs`
- CORS mặc định cho `http://localhost:5173`

### Frontend

```bash
cd source-code/frontend
npm install
npm run dev
```

- App: `http://localhost:5173`
- Vite proxy `/api` → backend (theo cấu hình `vite.config.ts`)

Đăng ký / đăng nhập → Dashboard → mở project tại **`/studio/:projectId`**.

---

## Biến môi trường backend (tóm tắt)

Xem đầy đủ trong `source-code/backend/.env.example`:

- `PORT`, `MONGODB_URI`, `DB_NAME`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `GEMINI_API_KEY` (bắt buộc cho AI generate)
- Tùy chọn reset mật khẩu: `FRONTEND_URL`, `PASSWORD_RESET_EXPIRES_MIN`, `PASSWORD_RESET_LOG_LINK`

---

## API & bảo mật

- Mọi response thành công qua envelope: `{ success: true, data: ... }`.
- Auth: JWT Bearer; các route project theo `:id` dùng **owner guard**.
- Chi tiết endpoint: **Swagger** (`/api/docs`) và **SYSTEM_ARCHITECTURE.md** mục API.

---

## Build production

```bash
# Backend
cd source-code/backend && npm run build && npm run start:prod

# Frontend
cd source-code/frontend && npm run build && npm run preview
```

---

## License

Dự án private / nội bộ — xem `package.json` từng package nếu cần.
