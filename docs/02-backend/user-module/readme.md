# User Module

## 1) Mục tiêu

Module người dùng cung cấp **Mongoose schema + service** cho đăng ký, đăng nhập, profile và **đặt lại mật khẩu** (token hash trên document user).

---

## 2) User Schema (triển khai hiện tại)

Collection: `users` (`source-code/backend/src/modules/users/schemas/user.schema.ts`).

| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| `email` | `string` | Bắt buộc, unique, index, `lowercase` + `trim` |
| `password` | `string` | Bắt buộc, `select: false`, hash bcrypt ở `pre('save')` khi đổi |
| `fullName` | `string` | Bắt buộc, `trim` |
| `passwordResetTokenHash` | `string?` | `select: false` — SHA-256 hex của token reset (không lưu token thô) |
| `passwordResetExpires` | `Date?` | `select: false` — hết hạn token |
| `createdAt` / `updatedAt` | `Date` | `timestamps: true` |

---

## 3) UsersService (điểm chạm chính)

- `create(dto)` — tạo user mới.
- `findByEmail(email, includePassword?)` — khi login cần `includePassword: true` để `select('+password')`.
- `findById(id)` — profile và thao tác nội bộ.

Chi tiết method bổ sung (update password reset fields, v.v.) nằm trong `users.service.ts` và được `AuthService` gọi.

---

## 4) Liên kết Auth Module

- **Register / Login / Profile / Forgot / Reset** — logic orchestration trong `AuthModule` + `AuthService`, persistence qua `UsersService` và schema trên.

---

## 5) Tài liệu liên quan

- `docs/02-backend/auth-module/readme.md`
- `SYSTEM_ARCHITECTURE.md` (mục Auth / Users)
