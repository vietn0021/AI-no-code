# 01 - Database Schema Specification (MongoDB)

## 1. Overview

Hệ thống sử dụng MongoDB làm cơ sở dữ liệu chính, **Mongoose ODM** trong NestJS. Có **5 collection** ứng với các schema triển khai trong `source-code/backend/src/modules/**/schemas/*.schema.ts`: `users`, `projects`, `project_versions`, `assets`, `prompts`.

---

## 2. Collections Detail

### 2.1 Users Collection (`users`)

- `_id`: ObjectId
- `email`: String (unique, index, lowercase, trim, required)
- `password`: String (bcrypt, `select: false`)
- `fullName`: String (required, trim)
- `passwordResetTokenHash`: String (optional, `select: false`)
- `passwordResetExpires`: Date (optional, `select: false`)
- `createdAt` / `updatedAt`: timestamps (`@Schema({ timestamps: true })`)

**File:** `modules/users/schemas/user.schema.ts`

---

### 2.2 Projects Collection (`projects`)

- `name`: String (required)
- `userId`: ObjectId → ref `User` (required, index)
- `description`: String (optional)
- `rawPrompt`: String (optional)
- `gameConfig`: Mixed (`Record<string, unknown>`, optional) — JSON game / editor
- `currentVersion`: Number (default `1`)
- `status`: Enum `draft` | `published` | `archived` (default `draft`, index)
- `createdAt` / `updatedAt`: timestamps

**Index:** `{ userId: 1, status: 1 }`, `{ userId: 1, createdAt: -1 }`

**File:** `modules/projects/schemas/project.schema.ts`

---

### 2.3 ProjectVersions Collection (`project_versions`)

*Snapshot `gameConfig` trước mỗi lần đổi state (manual / AI / rollback).*

- `projectId`: ObjectId → ref `Project` (required, index)
- `version`: Number (required) — số phiên bản tại thời điểm snapshot
- `snapshot`: Mixed (required) — bản sao cấu hình game
- `changeSource`: Enum `ai` | `manual` | `rollback` (required)
- `createdBy`: ObjectId → ref `User` (optional)
- `createdAt` / `updatedAt`: timestamps

**Index:** `{ projectId: 1, version: -1 }`

**File:** `modules/project-versions/schemas/project-version.schema.ts`

---

### 2.4 Assets Collection (`assets`)

*File upload gắn với project (ảnh / âm thanh / json tùy `fileType`).*

- `projectId`: ObjectId → ref `Project` (required, index)
- `uploadedBy`: ObjectId → ref `User` (required)
- `fileName`: String (required, trim)
- `fileUrl`: String (required, trim) — URL phục vụ file
- `fileType`: Enum `image` | `audio` | `json` (required)
- `fileSize`: Number (required, bytes, min 0)
- `createdAt` / `updatedAt`: timestamps

**File:** `modules/assets/schemas/asset.schema.ts`

---

### 2.5 Prompts Collection (`prompts`)

*Lịch sử hội thoại AI Studio theo từng project (từng dòng là một document, role `user` hoặc `assistant`).*

- `projectId`: ObjectId → ref `Project` (required, index)
- `userId`: ObjectId → ref `User` (required, index)
- `role`: Enum `user` | `assistant` (required)
- `content`: String (required, trim)
- `createdAt` / `updatedAt`: timestamps

**Index:** compound `{ projectId: 1, userId: 1, createdAt: 1 }`

**File:** `modules/prompts/schemas/prompt.schema.ts`

---

## 3. Indexing Strategy

- **User:** unique + index trên `email`.
- **Project:** compound `{ userId, status }`, `{ userId, createdAt }`.
- **ProjectVersion:** `{ projectId, version }` để lấy lịch sử / rollback.
- **Asset:** index `projectId` để liệt kê asset theo dự án.
- **Prompt:** compound `{ projectId, userId, createdAt }` để tải lịch sử chat theo thứ tự.

---

## 4. Technical Notes for AI (Vibe Coding)

- Dùng `@nestjs/mongoose` (`@Schema`, `@Prop`, `SchemaFactory`).
- `gameConfig` / `snapshot` nên là `Schema.Types.Mixed` để JSON game thay đổi theo AI mà không vỡ validation Mongoose.
- Khi cần chủ sở hữu project, `populate('userId')` hoặc join ở tầng service.

**Sơ đồ quan hệ tổng quan:** xem `SYSTEM_ARCHITECTURE.md` mục **5) Database Schema Relations**.
