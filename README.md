# AI No-code Game Studio

Ứng dụng **studio tạo game không cần code**: người dùng đăng ký/đăng nhập, quản lý dự án, chỉnh **game config** (JSON) qua **AI (Groq hoặc Gemini)** và **editor trực quan** (preview / play Phaser, layers, upload ảnh, **thư viện sprite Kenney**, mẫu có sẵn), có **versioning / rollback** phía backend.

**Publish & chơi công khai:** owner có thể **publish** project → link `/play/{slug}` (SPA; frontend deploy Vercel dùng `source-code/frontend/vercel.json` rewrite). API public: `GET /api/projects/play/:slug` (không JWT). Backend dùng **`FRONTEND_URL`** để dựng `publishUrl`.

**Play mode (Studio):** ngoài các game **template** (Snake, Flappy, …), Studio hỗ trợ **behavior runtime** — entity có `behaviors[]` khi không đặt `templateId`; scene legacy khi chưa có behaviors. Chi tiết: `docs/03-frontend/studio-editor/behavior-runtime.md`, `SYSTEM_ARCHITECTURE.md` (mục Play + **1.4 sơ đồ chức năng**).

---

## Kiến trúc & tài liệu

| Tài liệu | Mô tả |
|----------|--------|
| [**SYSTEM_ARCHITECTURE.md**](./SYSTEM_ARCHITECTURE.md) | Bản đồ kiến trúc **full stack**: module backend, API, frontend Studio, entity/sprite, file tham chiếu. |
| [**docs/**](./docs/) | Đặc tả theo module: khởi tạo, system design, backend, frontend, testing. |

Gợi ý đọc nhanh: `docs/00-project-init/readme.md`, `docs/03-frontend/studio-editor/readme.md`, `docs/03-frontend/studio-editor/behavior-runtime.md`, `docs/02-backend/auth-module/readme.md`.

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
- **AI:** tùy cấu hình `.env` backend:
  - Nếu có **`GROQ_API_KEY`** → `generateGameConfig` dùng **Groq** (mặc định model `llama-3.3-70b-versatile`, đổi bằng `GROQ_MODEL`).
  - Nếu không → dùng **Gemini** — cần **`GEMINI_API_KEY`** (và `GET /ai/models` vẫn dùng Gemini).

---

## Chạy nhanh (development)

### Backend

```bash
cd source-code/backend
cp .env.example .env
# Chỉnh MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN; thêm GROQ_API_KEY hoặc GEMINI_API_KEY (xem .env.example)
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

Đăng ký / đăng nhập → Dashboard → mở project tại **`/studio/:projectId`**. Sau **Publish**, mở **`/play/<slug>`** (có thể thử ở cửa sổ ẩn danh — không cần login).

---

## Biến môi trường backend (tóm tắt)

Xem đầy đủ trong `source-code/backend/.env.example`:

- `PORT`, `MONGODB_URI`, `DB_NAME`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `GROQ_API_KEY`, `GROQ_MODEL` (tùy chọn — ưu tiên khi có key)
- `GEMINI_API_KEY` (bắt buộc khi **không** dùng Groq cho generate; cần cho `GET /ai/models`)
- `FRONTEND_URL` — link reset mật khẩu **và** `publishUrl` khi gọi `POST /projects/:id/publish`
- Tùy chọn: `PASSWORD_RESET_EXPIRES_MIN`, `PASSWORD_RESET_LOG_LINK`

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
