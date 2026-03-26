# Studio Editor

## 1) Mục tiêu

**Studio Editor** là màn hình chính để người dùng nhập prompt AI, xem **preview game** theo `gameConfig` (JSON), chỉnh sửa/inspect thực thể, **thư viện asset mẫu (kéo vào canvas)** và **lưu / tải dự án** (đồng bộ backend + versioning khi generate/rollback).

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
- Lịch sử tin nhắn + trạng thái loading / lỗi (toast + envelope backend).

### 2.3 Cột giữa — Preview (Game Canvas)

- Khung **aspect-video**, bên trong `GameCanvas.tsx`.
- Đọc `gameConfig` từ **`useEditorStore`** (`Zustand`).
- **Entity hình học:** `div` theo `shapeType` (Square / Circle / Triangle), màu `colorHex`, vị trí **%** (tâm), kích thước **px** (`entityView.ts`: `resolveEntityPosition`, `resolveEntitySize`, `resolveEntityColor`).
- **Entity sprite (ảnh):** khi `type === 'sprite'` và có **`assetUrl`** → render **`<img>`** bên trong wrapper tuyệt đối, **`object-fit: contain`**, không méo; vẫn **kéo bằng pointer** (cùng cơ chế `entity-${id}` + `updateEntity`).
- **Kéo asset từ sidebar:** `onDragOver` / `onDrop` trên vùng canvas — MIME `application/x-studio-asset`, payload JSON `{ assetUrl, label }` → `addEntity(...)` tại tọa độ thả (%).

### 2.4 Cột phải — Tabs Layers / Assets + Inspector

- `EditorRightColumn.tsx`:
  - Tab **Layers** → `LayersPanel.tsx`: danh sách entity (đảo thứ tự render), chọn / xóa (confirm), thumbnail sprite nếu có `assetUrl`.
  - Tab **Assets** → `AssetsPanel.tsx`: danh sách mẫu từ `lib/studioSampleAssets.ts` (Player, Enemy, Tree, Coin, … — hiện dùng **SVG data URL** cố định, không phụ thuộc CDN). Mỗi mục `draggable`.
- **Inspector:** `InspectorPanel.tsx` — vị trí %, kích thước px, palette Asset Module + HEX, xóa entity; hiển thị meta khi chưa chọn (theme scene).

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

- **GET** `/api/projects/:id` khi vào `/studio/:projectId`.
- **PATCH** `/api/projects/:id` để lưu thay đổi (tên, mô tả, `gameConfig`, …) — có snapshot phía backend nếu `gameConfig` đổi.

### 4.3 Versions & rollback

- **GET** `/api/projects/:id/versions`, **POST** `/api/projects/:id/rollback` — theo DTO backend; UI có thể bổ sung slider/list (tài liệu hướng dẫn giữ nguyên mục 5 cũ nếu cần mở rộng).

### 4.4 Thử AI không ghi project

- **POST** `/api/ai/generate` — debug; Studio chính nên dùng generate theo project.

---

## 5) Route & bảo vệ

- **Route:** `/studio/:projectId` (`AppRoutes.tsx`, trong `PrivateRoute`).
- Backend: JWT + `ProjectOwnerGuard` cho thao tác theo `:id`.

---

## 6) Cấu trúc file thực tế (frontend)

```txt
source-code/frontend/src/pages/studio/
  EditorPage.tsx
  components/
    AiChatPanel.tsx
    GameCanvas.tsx
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
source-code/frontend/src/store/
  useEditorStore.ts        # GameEntity, EditorGameConfig, addEntity, …
```

---

## 7) Tóm tắt checklist

| Hạng mục | Trạng thái / mô tả |
|----------|-------------------|
| Layout | 3 cột: Chat · Preview · (Layers \| Assets) + Inspector |
| Canvas | Hình học (div) + **sprite (`<img>` + object-contain)** |
| Assets | Tab Assets, kéo thả vào Preview → `addEntity` |
| Store | Zustand `useEditorStore` |
| AI | POST `/api/projects/:id/generate` + Bearer |
| Lưu / tải | GET + PATCH project, đồng bộ `gameConfig` |
