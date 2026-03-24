# Auth Module

## 1) Tổng quan

Module xác thực người dùng cho **AI No-code Studio** dùng **JWT (JSON Web Token)** — chỉ phát hành **Access Token** (phiên bản tối giản; có thể mở rộng Refresh Token sau).

- **Thuật toán ký:** HS256 (hoặc tương đương cấu hình Nest `JwtModule`).
- **Payload tối thiểu:** `sub` (user id), `email` (tùy chọn), `iat`, `exp`.

---

## 2) User Schema (sơ bộ)

Trường cốt lõi phục vụ đăng ký / đăng nhập:

| Trường | Kiểu | Quy tắc |
|--------|------|---------|
| `email` | `string` | **Bắt buộc**, chuẩn hóa `lowercase` + `trim`, **unique**, có **index** để đăng nhập nhanh. |
| `password` | `string` | **Bắt buộc**, lưu **đã hash** bằng **bcrypt** (salt rounds đề xuất 10–12). Dùng `select: false` để không trả về mặc định trong query. |
| `fullName` | `string` | **Bắt buộc** hoặc optional tùy UX; `trim`. |

**Ghi chú triển khai:**

- Schema Mongoose có thể bổ sung thêm `username`, `avatar`, `role`… nếu đã tồn tại trong hệ thống; tài liệu này nhấn mạnh tối thiểu cho **auth**.
- Khi **register**: hash password trước `save()`.
- Khi **login**: `bcrypt.compare(plain, user.password)` sau khi load user **có** field password (`.select('+password')`).

---

## 3) API & Flow

### 3.1 `POST /api/auth/register` — Đăng ký

- **Body (ví dụ):** `{ "email", "password", "fullName" }`
- **Bước xử lý:**
  1. Validate DTO (`class-validator`).
  2. Kiểm tra email chưa tồn tại → nếu trùng: `409 Conflict`.
  3. Hash password → tạo user → trả về thông tin user **không** có password (hoặc trả kèm token tùy chính sách sản phẩm).

### 3.2 `POST /api/auth/login` — Đăng nhập & nhận Token

- **Body:** `{ "email", "password" }`
- **Bước xử lý:**
  1. Tìm user theo email, `select('+password')`.
  2. So sánh bcrypt; sai → `401 Unauthorized`.
  3. Ký **JWT Access Token** (thời hạn ví dụ 15m–1h, cấu hình qua env `JWT_SECRET`, `JWT_EXPIRES_IN`).
- **Response (ví dụ):** `{ "access_token": "<jwt>", "token_type": "Bearer" }` và/hoặc object user tóm tắt.

### 3.3 `GET /api/auth/profile` — Thông tin user hiện tại

- **Header:** `Authorization: Bearer <access_token>`
- **Bảo vệ:** `JwtAuthGuard` (hoặc tương đương).
- **Bước xử lý:** Giải mã JWT → lấy `sub` → load user từ DB → trả `{ id, email, fullName, ... }` (không password).

---

## 4) Middleware / Guards & Project Module

### 4.1 JWT Guard (toàn cục hoặc theo route)

- Áp dụng `@UseGuards(JwtAuthGuard)` cho các route cần đăng nhập.
- Sau khi validate JWT, gắn `request.user` (payload hoặc user document đã load).

### 4.2 Bảo vệ Project Module — chỉ chủ sở hữu

`Project` có `userId` (owner). Quy tắc:

- **Đọc (GET project / list):** Có thể chỉ cho owner, hoặc public read + private write — mặc định đề xuất: **chỉ owner** xem/sửa project của mình.
- **Ghi (PATCH, POST generate, POST rollback, …):**  
  - So sánh `project.userId` với `request.user.id` (hoặc `sub` từ JWT).  
  - Không khớp → **`403 Forbidden`**.

**Cách triển khai gợi ý:**

1. **`JwtAuthGuard`** trên controller hoặc từng method Project.
2. **`ProjectOwnerGuard`** (custom): inject `ProjectsService` / repository → load project theo `:id` → kiểm tra `userId` === `req.user.sub`.
3. Hoặc **policy trong service** (sau guard JWT): mọi method `update*`, `generate`, `rollback` đều gọi `assertOwner(projectId, userId)` trước khi thực thi.

### 4.3 Auth Module vs Users Module

- Có thể gộp route `/auth/*` trong `AuthModule` và import `UsersModule` / model `User`.
- Hoặc tách rõ: `AuthModule` chỉ orchestrate JWT + gọi `UsersService`.

---

## 5) Biến môi trường gợi ý

```env
JWT_SECRET=<chuỗi-bí-mật-dài>
JWT_EXPIRES_IN=3600s
```

---

## 6) Tóm tắt flow

1. **Register** → tạo user, password đã hash.  
2. **Login** → nhận **Access Token**.  
3. **Profile** + **Project APIs** → gửi `Authorization: Bearer`, guard JWT + kiểm tra **owner** trên mọi thao tác thay đổi game/project.
