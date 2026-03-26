# Auth Flow

## 1) Muc tieu

Xay dung luong xac thuc Frontend cho AI No-code Studio theo huong:

- UI dong bo Sky Blue + Glassmorphism
- Logic dang nhap/dang ky ro rang, de test voi backend NestJS
- Co co che luu phien dang nhap (persistent auth)
- Bao ve cac route quan trong (Dashboard/Studio Editor)

---

## 2) UI/UX Specification

### 2.1 Layout tong quan

- Man hinh auth dat tren nen `bg-alice-blue`.
- Form chinh dung `GlassCard`, can giua man hinh.
- Width de xuat:
  - Mobile: `w-full max-w-sm`
  - Desktop: `w-full max-w-md`

Class goi y:

```txt
min-h-screen bg-bg-alice-blue flex items-center justify-center p-4
```

### 2.2 Thanh phan form

- `SmartInput`:
  - Email
  - Password
  - Full Name (chi hien thi o Register)
  - Password field co icon "con mat" de an/hien mat khau
- `PastelButton`:
  - Submit button dung `variant="secondary"` (Sky Blue)
- Link dieu huong:
  - Login -> Register
  - Register -> Login
  - Login -> Forgot Password

### 2.3 UX quy tac

- Validate co ban truoc khi submit:
  - Email dung format
  - Password >= 6 ky tu
  - Full Name khong rong (register)
- Disable nut submit trong luc request dang chay (`loading=true`).
- Hien helper text ngan gon ben duoi input neu sai dinh dang.

---

## 3) Logic Flow

### 3.1 Login Flow

1. User nhap Email + Password.
2. Frontend goi:
   - `POST /api/auth/login`
3. Neu thanh cong:
   - Lay `access_token` tu response.
   - Luu `access_token` vao `localStorage`.
   - Cap nhat global auth state (`isAuthenticated = true`, `user` neu co).
   - Dieu huong ve `/dashboard`.
4. Neu that bai:
   - Hien toast loi theo message backend.

Pseudo response mong doi:

```json
{
  "success": true,
  "data": {
    "access_token": "..."
  }
}
```

### 3.2 Register Flow

1. User nhap Full Name + Email + Password.
2. Frontend goi:
   - `POST /api/auth/register`
3. Neu thanh cong:
   - Lua chon A (uu tien): tu dong login bang thong tin vua tao.
   - Lua chon B: dieu huong ve `/login` kem toast "Dang ky thanh cong".
4. Neu that bai (vd: trung email):
   - Hien toast loi theo format backend.

### 3.3 Persistent Auth

Co 2 huong de xuat:

- **Triển khai hiện tại:** `AuthProvider` + `AuthContext` (`contexts/AuthProvider.tsx`) — lưu `access_token` trong `localStorage`, `login` / `logout` cập nhật state.
- Có thể mở rộng: gọi `GET /api/auth/profile` sau khi hydrate token để lấy `user` đầy đủ (tùy product).

State can co:

- `token: string | null`
- `isAuthenticated: boolean`
- `user: { id, email, fullName } | null`
- `login()`, `logout()`, `hydrateFromStorage()`

Quy tac khoi tao:

- Khi app mount, doc `localStorage.getItem('access_token')`.
- Neu co token, set `isAuthenticated=true`.
- Co the goi `GET /api/auth/profile` de xac thuc token con hop le.

### 3.4 Forgot Password Flow

1. User chon link `Forgot password?` o trang Login.
2. Frontend dieu huong den `/auth/forgot-password`.
3. User nhap email va gui form:
   - `POST /api/auth/forgot-password`
4. Neu thanh cong:
   - Hien thong bao thanh cong dang generic:
     - "If your email exists, a reset link has been sent."
5. Neu that bai:
   - Hien message loi tu backend theo format `success: false`.

### 3.5 Reset Password Flow

1. User mo link tu email (hoac query tu dev): `/auth/reset-password?token=...&email=...`
2. Form: email (co the pre-fill), token (co the pre-fill tu query), mat khau moi.
3. Frontend goi:
   - `POST /api/auth/reset-password`
   - Body: `{ email, token, password }` (`password` toi thieu 8 ky tu, dong bo Register)
4. Neu thanh cong:
   - Backend tra `{ message: "Password has been reset successfully" }` (trong envelope `success: true, data`).
   - Dieu huong ve `/auth/login` va hien toast thanh cong.
5. Neu that bai (token sai / het han / email khong khop):
   - Backend tra `400` voi message chung: `Invalid or expired reset token` (khong tiet lo chi tiet).

---

## 4) Error Handling

Backend dang tra loi dang:

```json
{
  "success": false,
  "message": "Noi dung loi",
  "statusCode": 401
}
```

Frontend can:

- Parse thong diep tu `message`.
- Hien toast notification theo muc do:
  - 400/401: warning/error
  - 409 (trung email): error voi message ro
- Khong hien loi ky thuat tho cho end-user.

Case can cover:

- Sai mat khau
- Email da ton tai
- Gui yeu cau quen mat khau that bai
- Token het han/khong hop le
- Loi mang tam thoi

---

## 5) Route Protection (Private Routes)

### 5.1 Route private

- `/dashboard`
- `/templates`, `/settings`
- `/studio/:projectId` (Studio Editor — tham số `projectId` thật từ API)

### 5.2 Rule

- Neu **khong co token** -> redirect ve `/login`.
- Neu co token nhung profile check fail -> clear token va redirect `/login`.

### 5.3 Guard component de xuat

- `PrivateRoute` wrapper:
  - Kiem tra `isAuthenticated`.
  - Neu false -> `<Navigate to="/login" replace />`
  - Neu true -> render children.

Pseudo:

```tsx
if (!isAuthenticated) return <Navigate to="/login" replace />
return children
```

---

## 6) API Contract can dung cho Auth Screen

- `POST /api/auth/register`
  - Body: `{ email, password, fullName }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
- `POST /api/auth/forgot-password`
  - Body: `{ email }`
- `POST /api/auth/reset-password`
  - Body: `{ email, token, password }`
- `GET /api/auth/profile`
  - Header: `Authorization: Bearer <access_token>`

---

## 7) Tong ket

Auth Flow can dam bao:

1. UI nhat quan voi Design System (`GlassCard`, `SmartInput`, `PastelButton secondary`).
2. Logic login/register dung API backend hien tai.
3. Co man hinh quen mat khau va link dieu huong ro rang.
4. Co man hinh dat lai mat khau (`/auth/reset-password`) sau forgot-password.
5. Password input ho tro an/hien bang icon con mat.
6. Luu trang thai dang nhap toan cuc va persistent sau refresh.
7. Co error UX ro rang theo format loi thong nhat tu backend.
8. Bao ve route private truoc khi vao Dashboard/Editor.
