# Studio Editor

## 1) Mục tiêu

**Studio Editor** là màn hình chính để người dùng nhập prompt AI, xem **preview game** theo `gameConfig` (JSON), chỉnh sửa/inspect thực thể, **upload ảnh + thư viện sprite (Kenney) + mẫu có sẵn (kéo vào canvas)**, **publish** link chơi công khai, và **lưu / tải dự án** (đồng bộ backend + versioning khi generate/rollback).

Giao diện đồng bộ tông **Sky Blue + White + Glassmorphism** với Dashboard.

---

## 2) Bố cục — Three-Column Layout (đã triển khai)

### 2.1 Tổng thể

- Trang: `EditorPage.tsx` — `flex` full height trong `PrivateRoute`.
- Ba vùng: **AI Chat** (trái, `motion.aside` co giãn), **Preview** (giữa), **Layers | Assets + Inspector** (phải).
- Nền: `bg-bg-alice-blue`; panel dùng glass + `backdrop-blur`.

### 2.2 Cột trái — AI Chat

- Component: `components/AiChatPanel.tsx`.
- Thu/phóng header; gọi `POST /api/projects/:projectId/generate` với Bearer token.
- **Ngữ cảnh scene (`contextPrompt`):** luôn nhúng **`gameConfig` đầy đủ** (`JSON.stringify`) + dòng **Yêu cầu** + khối **HƯỚNG DẪN TRẢ VỀ**:
  - Nếu có **`templateId`** và **chưa** có entity nào có `behaviors[]` → hướng dẫn ưu tiên chỉnh config template (giữ `templateId`); đổi mechanic → chuyển sang behavior (bỏ template, thêm `behaviors[]`).
  - Ngược lại → **ưu tiên behavior system** (mỗi entity `behaviors[]`, không `templateId`), kèm danh sách behavior/actions hợp lệ.
- **Payload gửi API** = `contextPrompt` đó. Trong UI, bubble user chỉ hiện **prompt gốc**.
- Lịch sử tin nhắn + trạng thái loading / lỗi (toast + envelope backend).

### 2.3 Cột giữa — Preview / Play

- Header khu vực canvas: toggle **Preview** | **Play** (`EditorPage.tsx`).
- **Preview:** khung **aspect-video**, `GameCanvas.tsx` — đọc `gameConfig` từ **`useEditorStore`**.
- **Play:** `GameRuntime.tsx` (Phaser 3 Arcade) — cùng `gameConfig`:
  - Có **`templateId`** (snake, flappy, …) → scene template tương ứng.
  - **Không** template và có entity với **`behaviors[]` không rỗng** → `BehaviorRuntime.tsx` (scene `studioBehavior`): movement, physics, spawn, colliders, `rules`, score/lives/timer.
  - Còn lại → scene **legacy** (`studioRuntime`): player WASD/mũi tên + entity static; texture shape/assetUrl.
  - Chi tiết: **[behavior-runtime.md](./behavior-runtime.md)**.
- **Entity hình học (Preview):** `div` theo `shapeType` (Square / Circle / Triangle), màu `colorHex`, vị trí **%** (tâm), kích thước **px** (`entityView.ts`).
- **Entity sprite (ảnh):** `type === 'sprite'` + **`assetUrl`** → **`<img>`**, **`object-fit: contain`**; kéo pointer như entity khác.
- **Kéo asset từ sidebar:** MIME `application/x-studio-asset` → `addEntity` tại tọa độ thả (%).

### 2.4 Cột phải — Tabs Layers / Assets + Inspector

- `EditorRightColumn.tsx`:
  - Tab **Layers** → `LayersPanel.tsx`: danh sách entity (đảo thứ tự render), chọn / xóa (confirm), thumbnail sprite nếu có `assetUrl`.
  - Tab **Assets** → `AssetsPanel.tsx`: **3 tab con** — *Ảnh của bạn* (upload + `fetchProjectAssets`), *Thư viện* (sprite **Kenney** — URL Supabase public, `lib/spriteLibrary.ts`, lọc tên, `loading="lazy"` + skeleton), *Mẫu có sẵn* (`studioSampleAssets.ts`, SVG data URL). Mỗi ô kéo được; MIME **`application/x-studio-asset`** (`STUDIO_ASSET_DRAG_MIME`), payload JSON `{ assetUrl, label }`.
- **Inspector:** `InspectorPanel.tsx` — vị trí %, kích thước px (commit blur / Enter), color picker + HEX hai chiều, palette Asset Module, nút xóa (Trash + `window.confirm`); meta theme khi chưa chọn entity.

### 2.5 Header Studio — Publish

- `EditorPage.tsx`: nút **Publish** / badge **Published** / **Unpublish**, toast + modal chia sẻ link.
- API: `services/publish.api.ts` (`POST .../publish`, `POST .../unpublish`).
- Store: `useEditorStore` — `isPublished`, `publishSlug`, `setPublishState` (đồng bộ khi `GET /projects/:id`).

### 2.6 Trang chơi công khai (không login)

- Route **`/play/:slug`** (`AppRoutes.tsx`, **ngoài** `PrivateRoute`) → `pages/play/PlayPage.tsx`.
- `services/play.api.ts`: `GET /api/projects/play/:slug` → `gameConfig` + `name`; `GameRuntime` nhận **`gameConfig` qua prop** (không dùng store editor).
- SEO: cập nhật `document.title` / meta description trên client.

---

## 3) Cơ chế Render & kiểu dữ liệu entity

### 3.1 Nguồn dữ liệu

- `useEditorStore`: `gameConfig` sau khi load project, generate AI, hoặc chỉnh tay; `setGameConfig`, `updateEntity`, `removeEntity`, **`addEntity`** (sprite thả từ Assets).

### 3.2 Bảng render

| Điều kiện | Cách render |
|-----------|-------------|
| `type === 'sprite'` và có `assetUrl` | Wrapper `motion.div` + `<img className="object-contain" />` |
| Ngược lại | `div` + `backgroundColor` + bo góc / `clip-path` tam giác theo `shapeType` |

### 3.3 Sprite thủ công & lưu DB

- Entity sprite có `settings.studioLabel` (từ thư viện) để hiển thị trên Layers.
- Khi **Lưu dự án** (`PATCH` project), toàn bộ `gameConfig.entities` gửi lên backend — field `assetUrl` / `type: sprite` được giữ nhờ **Zod `EntitySchema.passthrough()`** phía AI; lưu ý: schema vẫn yêu cầu còn ít nhất một entity `type: 'player'` trong config hợp lệ do AI (xem backend `GameConfigSchema`).

---

## 4) Logic kết nối API

### 4.1 Generate (Studio)

- **POST** `/api/projects/:projectId/generate` — `Authorization: Bearer <token>`, body `{ prompt }`.
- Thành công: cập nhật store với project / `gameConfig` mới.

### 4.2 Load & lưu dự án

- **GET** `/api/projects/:id` khi vào `/studio/:projectId` (response map kèm `isPublished`, `slug` cho UI publish).
- **PATCH** `/api/projects/:id` để lưu thay đổi (tên, mô tả, `gameConfig`, …) — có snapshot phía backend nếu `gameConfig` đổi.

### 4.2b Publish (tuỳ chọn)

- **POST** `/api/projects/:id/publish`, **POST** `.../unpublish` — Bearer + owner; xem `docs/02-backend/project-module/readme.md`.

### 4.3 Versions & rollback

- **GET** `/api/projects/:id/versions`, **POST** `/api/projects/:id/rollback` — theo DTO backend; UI có thể bổ sung slider/list (tài liệu hướng dẫn giữ nguyên mục 5 cũ nếu cần mở rộng).

### 4.4 Thử AI không ghi project

- **POST** `/api/ai/generate` — debug; Studio chính nên dùng generate theo project.

---

## 5) Route & bảo vệ

- **Route Studio:** `/studio/:projectId` (`AppRoutes.tsx`, trong `PrivateRoute`).
- **Route play công khai:** `/play/:slug` — **không** `PrivateRoute`.
- Backend: JWT + `ProjectOwnerGuard` cho thao tác theo `:id`; `GET /projects/play/:slug` không auth.

---

## 6) Cấu trúc file thực tế (frontend)

```txt
source-code/frontend/src/pages/studio/
  EditorPage.tsx
  components/
    AiChatPanel.tsx
    GameCanvas.tsx
    GameRuntime.tsx          # Phaser — chọn template / behavior / legacy Play
    BehaviorRuntime.tsx      # Phaser scene behaviors + rules
    EditorRightColumn.tsx    # tab Layers | Assets
    LayersPanel.tsx
    AssetsPanel.tsx
    InspectorPanel.tsx
  lib/
    entityView.ts
    studioSampleAssets.ts    # STUDIO_SAMPLE_ASSETS, STUDIO_ASSET_DRAG_MIME
    confirmEntityDelete.ts
```

```txt
source-code/frontend/src/pages/play/
  PlayPage.tsx             # /play/:slug — public, GameRuntime + prop gameConfig
```

```txt
source-code/frontend/src/lib/
  spriteLibrary.ts         # SPRITE_CATEGORIES / Kenney URLs (Supabase public)
```

```txt
source-code/frontend/src/store/
  useEditorStore.ts        # GameEntity, EditorGameConfig, addEntity, isPublished, publishSlug, …
```

```txt
source-code/frontend/src/services/
  publish.api.ts
  play.api.ts
```

---

## 7) Tóm tắt checklist

| Hạng mục | Trạng thái / mô tả |
|----------|-------------------|
| Layout | 3 cột: Chat · Preview · (Layers \| Assets) + Inspector |
| Canvas | Hình học (div) + **sprite (`<img>` + object-contain)** |
| Assets | Tab Assets (**Ảnh bạn | Thư viện Kenney | Mẫu**), kéo thả → `addEntity` |
| Publish | Header Editor + `publish.api.ts` + store `isPublished` / `publishSlug` |
| Play public | `/play/:slug` — `PlayPage` + `play.api.ts` |
| Store | Zustand `useEditorStore` |
| AI | POST `/api/projects/:id/generate` + Bearer; prompt có context `gameConfig` (payload), UI chỉ hiện text user |
| Play | Toggle Play → `GameRuntime` (template \| `BehaviorRuntime` \| legacy) |
| Lưu / tải | GET + PATCH project, đồng bộ `gameConfig` |
