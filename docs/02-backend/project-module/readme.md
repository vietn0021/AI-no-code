# Project Module

## 1) Mongoose Schema: `Project`

Muc tieu cua `Project` la luu trang thai hien tai (latest) cua game ma user dang lam viec.

### Truong de xuat

- `name: string`  
  - Required, trim.
- `description?: string`  
  - Optional, mo ta ngan ve project.
- `gameConfig: Record<string, unknown>`  
  - Cau hinh game hien tai (JSON linh hoat, nen dung `Schema.Types.Mixed`).
- `currentVersion: number`  
  - So phien ban hien tai cua project. Mac dinh `1`.
- `userId: ObjectId`  
  - Ref toi `User`, required, index de lay danh sach project theo user nhanh.
- `isPublished: boolean` (default `false`, index) — cho phep `GET /projects/play/:slug`.
- `publishedAt?: Date`
- `slug?: string` (trim, unique sparse index) — URL play; sinh khi publish neu chua co.

### Goi y schema (Nest + Mongoose)

- Dung `@Schema({ timestamps: true, collection: 'projects' })`.
- Dung `@Prop({ type: mongoose.Schema.Types.Mixed })` cho `gameConfig`.
- Dung index phu hop:
  - `{ userId: 1, createdAt: -1 }` cho man hinh dashboard.

---

## 2) Version Schema: `ProjectVersion` (Snapshot)

`ProjectVersion` dung de luu lich su truoc moi lan cap nhat project, giup rollback an toan.

### Truong de xuat

- `projectId: ObjectId`  
  - Ref toi `Project`, required, index.
- `version: number`  
  - So phien ban snapshot (thuong bang `Project.currentVersion` truoc khi update).
- `snapshot: Record<string, unknown>`  
  - Ban sao `gameConfig` tai thoi diem luu (dung `Schema.Types.Mixed`).
- `changeSource: 'ai' | 'manual' | 'rollback'`  
  - Nguon gay thay doi (de debug/audit).
- `createdBy?: ObjectId`  
  - User thuc hien thao tac (neu co context auth).

### Goi y schema

- Dung `@Schema({ timestamps: true, collection: 'project_versions' })`.
- Dung `@Prop({ type: mongoose.Schema.Types.Mixed, required: true })` cho `snapshot`.
- Dung index:
  - `{ projectId: 1, version: -1 }` de lay lich su nhanh.

---

## 3) Logic nghiep vu (AI generate + versioning)

Khi AI generate xong game config moi, he thong can thuc hien theo thu tu:

1. Tim `Project` hien tai theo `projectId`.
2. Tao ban ghi `ProjectVersion` chua **ban cu** truoc khi ghi de:
   - `version = project.currentVersion`
   - `snapshot = project.gameConfig`
   - `changeSource = 'ai'`
3. Cap nhat `Project`:
   - `gameConfig = aiOutput`
   - `currentVersion = currentVersion + 1`
   - (tuy chon) cap nhat `description/rawPrompt` neu can.
4. Tra ve `Project` moi nhat cho frontend.

### Luu y quan trong

- Nen dung **transaction** (Mongo session) de dam bao:
  - tao `ProjectVersion` va update `Project` thanh cong cung nhau.
- Neu transaction fail:
  - rollback toan bo, khong duoc de tinh trang mat dong bo version.

---

## 4) API can thiet

Duoi day la bo endpoint toi thieu cho `Project Module`.

### 4.1 Create Project

- `POST /api/projects`
- **Bắt buộc:** header `Authorization: Bearer <access_token>` (`JwtAuthGuard` trên toàn bộ `ProjectsController`).
- Body (`CreateProjectDto`):
  - `name` (bắt buộc), `description?`, `rawPrompt?`, `gameConfig?`, `status?`
  - **Không** gửi `userId` — server gán owner từ JWT (`@CurrentUser() user.sub`).
- Kết quả:
  - Tạo project mới với `currentVersion = 1`, `userId` = user đăng nhập.

### 4.2 Get Project

- `GET /api/projects/:id`
- Ket qua:
  - Tra ve chi tiet project hien tai (latest state).

### 4.3 Update Project (manual update)

- `PATCH /api/projects/:id`
- Body:
  - truong can cap nhat (`name`, `description`, `gameConfig`, ...)
- Logic:
  - Neu `gameConfig` thay doi, luu snapshot vao `ProjectVersion` truoc roi moi update.

### 4.4 Update by AI Generate

- `POST /api/projects/:id/generate`
- Body:
  - `prompt` (Studio gửi **`contextPrompt`**: JSON `gameConfig` + yêu cầu + hướng dẫn template vs behavior — xem `docs/03-frontend/studio-editor/readme.md`).
- Logic (`ProjectsService.generate`):
  1. `AiEngineService.detectGameTemplate(prompt)` → `templateId`, patch config, `confidence`.
  2. Nếu **confidence > 0.7** và template ≠ `none` → **`buildTemplateGameConfig`** (merge `templateDefaults` project).
  3. Ngược lại → **`generateGameConfig(prompt, projectId)`** (full gameConfig, có thể có `behaviors[]`, `rules`, `lives`).
  4. **Template-edit heuristic:** nếu prompt chứa một trong các chuỗi `Người dùng đang chỉnh sửa game template`, `Đang dùng template:`, `CHỈ update templateConfig`, và project đang cùng `templateId` với detection → có thể nâng confidence mặc định để giữ nhánh template.
  5. Lưu snapshot cũ vào `ProjectVersion`, cập nhật `Project.gameConfig`, tăng `currentVersion`.

### 4.5 Rollback Project

- `POST /api/projects/:id/rollback`
- Body:
  - `targetVersion` hoac `projectVersionId`
- Logic:
  - Lay snapshot can quay lai.
  - Luu state hien tai thanh 1 `ProjectVersion` moi (de co the undo rollback neu can).
  - Gan `Project.gameConfig = snapshot`, cap nhat `currentVersion`.

### 4.6 Get Version History

- `GET /api/projects/:id/versions`
- Ket qua:
  - Danh sach cac snapshot, sap xep moi nhat truoc.

### 4.7 Publish / Unpublish (chia sẻ game)

- `POST /api/projects/:id/publish` — `JwtAuthGuard` + `ProjectOwnerGuard`
  - Đặt `isPublished = true`, `publishedAt = now`
  - Nếu chưa có `slug`: tạo `slugify(name) + '-' + randomBytes(4).toString('hex')` (tránh trùng unique, có retry)
  - Response: `{ slug, publishUrl }` (`publishUrl` dùng env **`FRONTEND_URL`** + `/play/{slug}`)
- `POST /api/projects/:id/unpublish` — cùng guard
  - Đặt `isPublished = false`
  - Response: `{ success: true }`

### 4.8 Play công khai (không JWT)

- `GET /api/projects/play/:slug` — **không** guard
  - Tìm project theo `slug`; nếu không tồn tại hoặc `isPublished !== true` → 404
  - Response: `{ gameConfig, name }` (không lộ dữ liệu owner / rawPrompt)

**Schema:** thêm `isPublished`, `publishedAt`, `slug` trên `Project` — xem `docs/01-system-design/database-schema.md`.

---

## 5) Tong ket flow chuan

- `Project` = trang thai hien tai.
- `ProjectVersion` = lich su.
- Moi lan update quan trong (dac biet AI generate) deu:
  - save snapshot cu -> update ban moi.
- Co endpoint rollback de quay ve ban on dinh bat ky.
