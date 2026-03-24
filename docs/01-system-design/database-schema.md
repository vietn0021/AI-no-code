# 01 - Database Schema Specification (MongoDB)

## 1. Overview
Hệ thống sử dụng MongoDB làm cơ sở dữ liệu chính. Sử dụng Mongoose ODM trong NestJS để quản lý các Collection. Các Schema cần tuân thủ tính nhất quán và tối ưu hóa truy vấn thông qua Indexing.

---

## 2. Collections Detail

### 2.1 Users Collection
- `_id`: ObjectId (Auto-generated)
- `username`: String (Unique, Required, Index)
- `email`: String (Unique, Required, Index)
- `password`: String (Hashed, Select: false - không trả về mặc định)
- `avatar`: String (URL từ Cloudinary/Supabase)
- `role`: Enum ['user', 'admin'] (Default: 'user')
- `timestamps`: true (Tự động tạo `createdAt`, `updatedAt`)

### 2.2 Projects Collection (Core)
- `name`: String (Required)
- `userId`: ObjectId (Ref: 'User', Index)
- `description`: String
- `rawPrompt`: String (Lưu input gốc để tái tạo logic)
- `gameConfig`: Object (Schema.Types.Mixed - Flexible JSON định nghĩa game)
- `version`: Number (Mặc định: 1)
- `status`: Enum ['draft', 'published', 'archived'] (Default: 'draft', Index)
- `timestamps`: true

### 2.3 ProjectVersions Collection (Versioning)
*Mục đích: Lưu trữ lịch sử thay đổi của cấu hình game.*
- `projectId`: ObjectId (Ref: 'Project', Index)
- `version`: Number (Phiên bản tương ứng)
- `gameConfig`: Object (Snapshot của cấu hình tại thời điểm đó)
- `createdAt`: Date (Default: Date.now)

### 2.4 Assets Collection
- `projectId`: ObjectId (Ref: 'Project', Index)
- `uploadedBy`: ObjectId (Ref: 'User')
- `fileName`: String
- `fileUrl`: String
- `fileType`: Enum ['image', 'audio', 'json']
- `fileSize`: Number (Bytes)
- `timestamps`: true

### 2.5 Prompts Collection (AI History)
*Mục đích: Debug và cải thiện độ chính xác của AI.*
- `userId`: ObjectId (Ref: 'User', Index)
- `projectId`: ObjectId (Ref: 'Project', Index)
- `prompt`: String (Câu lệnh người dùng gửi lên)
- `response`: Object (Kết quả thô trả về từ AI Engine)
- `createdAt`: Date (Default: Date.now)

---

## 3. Indexing Strategy
- **User:** Index trên `email` và `username`.
- **Project:** Compound Index `{ userId: 1, status: 1 }` để tải danh sách dự án của user nhanh hơn.
- **Version:** Index trên `projectId` để truy xuất lịch sử phiên bản.
- **Prompt:** Index trên `projectId` để theo dõi tiến trình của một dự án cụ thể.

## 4. Technical Notes for AI (Vibe Coding)
- Sử dụng `@nestjs/mongoose` Decorators (`@Schema`, `@Prop`, `@Factory`).
- `gameConfig` phải được định nghĩa là `type: Schema.Types.Mixed` để tránh lỗi validation khi AI thay đổi cấu trúc JSON.
- Luôn sử dụng `populate` khi cần lấy thông tin `owner` của project.