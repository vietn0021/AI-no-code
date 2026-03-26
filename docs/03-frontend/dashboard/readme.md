# Dashboard

## 1) Mục tiêu

Màn **Dashboard** là trung tâm quản lý dự án game sau khi đăng nhập: duyệt danh sách, tạo dự án mới, điều hướng tới Studio Editor. Giao diện đồng bộ **Sky Blue + White + Glassmorphism** với `theme-config` và `shared-components`.

---

## 2) Bố cục (Layout)

### 2.1 Tổng thể

- Nền trang: `bg-bg-alice-blue` (hoặc gradient rất nhẹ từ alice blue sang white).
- Cấu trúc: **Sidebar cố định** + **vùng nội dung** (top bar + main).

Class gợi ý:

```txt
min-h-screen bg-bg-alice-blue flex
```

### 2.2 Sidebar (trái)

- Chiều rộng cố định (vd: `w-56` / `w-64` trên desktop); trên mobile có thể thu gọn thành drawer (tùy chọn sau).
- **Glassmorphism**, tông **xanh nhạt**:
  - Dùng class `.glass-surface` + `bg-sky-light/30` hoặc `bg-white/25`
  - `border border-white/40`, `backdrop-blur-md`, `rounded-glass` (cạnh trong phù hợp layout)
- Nội dung:
  - **Logo** (text hoặc icon + "AI No-code Studio") ở đầu sidebar.
  - Điều hướng (link hoặc `NavLink` active state):
    - **Dự án của tôi** — route chính dashboard (vd: `/dashboard`).
    - **Thư viện mẫu** — placeholder route (vd: `/templates` hoặc disabled + "Sắp ra mắt").
    - **Cài đặt** — vd: `/settings` hoặc modal profile.
- Hover item: `hover:bg-white/15`, transition mềm.

### 2.3 Top Bar (trên main)

- Nền: glass nhẹ hoặc `bg-white/40` + `backdrop-blur-md`, `border-b border-white/30`.
- **Thanh tìm kiếm dự án**:
  - Dùng `SmartInput` hoặc input tương đương, placeholder: "Tìm dự án..."
  - Filter **client-side** theo tên/mô tả (trước khi có API search riêng).
- **Profile User**:
  - **Avatar tròn** tone xanh: dùng `IconWrapper` hoặc `img` trong `rounded-full ring-2 ring-sky-dark/20 bg-sky-light/80`.
  - Click mở menu nhỏ: tên, email (nếu có từ `/api/auth/profile`), **Đăng xuất** (xóa token, về `/auth/login`).

### 2.4 Main Area

- Padding: `p-6 md:p-8`.
- **Tiêu đề**: "Dự án của bạn" — `text-2xl md:text-3xl font-semibold text-sky-dark`.
- **Nút "Tạo dự án mới"** nổi bật:
  - Dùng `PastelButton` `variant="secondary"` (Sky Blue) hoặc primary tùy contrast.
  - Đặt cùng hàng tiêu đề: `flex flex-wrap items-center justify-between gap-4`.

---

## 3) Danh sách dự án (Project Grid)

### 3.1 Lưới card

- Layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6`.
- Mỗi ô là một **`GlassCard`** (có thể `interactive` để hover nhẹ).

### 3.2 Nội dung mỗi card

1. **Hình placeholder** (đầu card):
   - Gradient xanh–trắng: vd `bg-gradient-to-br from-sky-light via-white to-bg-alice-blue`
   - Chiều cao cố định (vd `h-32`), `rounded-xl`, có thể icon game nhỏ ở giữa.
2. **Tên dự án** — `font-semibold text-slate-800`, 1 dòng, truncate nếu dài.
3. **Mô tả ngắn** — 2 dòng max, `text-sm text-slate-600 line-clamp-2`.
4. **Ngày sửa đổi cuối** — format locale (vd `vi-VN`), nhãn "Cập nhật: …".
   - Map từ `updatedAt` của API (hoặc `createdAt` nếu backend chưa có `updatedAt` trong response).

### 3.3 Tương tác

- Click card → điều hướng tới Studio Editor: **`/studio/:projectId`** (đúng route trong `AppRoutes.tsx`).
- (Tùy chọn sau) menu `…` trên card: Đổi tên, Xóa.

---

## 4) Logic kết nối API

### 4.1 Lấy danh sách dự án

- **GET** `/api/projects`
- Header: `Authorization: Bearer <access_token>` (lấy từ `localStorage` / `AuthContext`).
- Response (sau envelope interceptor): `{ success: true, data: Project[] }` — cấu trúc cụ thể khớp backend (`id`, `name`, `description`, `updatedAt`/`createdAt`, …).
- Trạng thái UI:
  - `loading`: skeleton hoặc `LoadingState`.
  - `error`: banner/toast theo `{ success: false, message }`.

### 4.2 Tạo dự án mới

1. Click **"Tạo dự án mới"** → mở **Modal** (overlay mờ + focus trap).
2. Nội dung modal: **`GlassCard`** bên trong, form:
   - `SmartInput` hoặc input tên dự án (bắt buộc).
   - (Tùy chọn) mô tả ngắn nếu API hỗ trợ.
3. Submit → **POST** `/api/projects`
   - Header: `Authorization: Bearer <access_token>`.
   - Body: theo `CreateProjectDto` backend (vd `{ name, description? }` — **không** gửi `userId`, server lấy từ JWT).
4. Thành công: đóng modal, **invalidate/refetch** danh sách hoặc prepend project mới vào state, có thể điều hướng thẳng vào editor.

### 4.3 Private route

- Dashboard chỉ cho user đã đăng nhập (đã mô tả trong `auth-flow/readme.md`).

---

## 5) Trạng thái trống (Empty State)

Khi **GET** trả về mảng rỗng (hoặc sau filter không còn item):

- Không hiển thị grid trống cứng nhắc.
- **Minh họa nhẹ**:
  - SVG/illustration đơn giản (folder, rocket, hoặc khối gradient + icon `lucide-react`), tông pastel xanh.
- Copy ngắn: ví dụ "Chưa có dự án nào. Hãy tạo dự án game đầu tiên."
- Nút CTA: **"Bắt đầu dự án đầu tiên của bạn"** — cùng hành vi với **"Tạo dự án mới"** (mở modal tạo).

---

## 6) Hiệu ứng (framer-motion)

- **Project grid**: khi data load xong, các **GlassCard** xuất hiện lần lượt (**stagger**).
  - Gợi ý: `motion.div` bọc từng card, `variants` container + `staggerChildren: 0.06`, child `initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}`.
- Giữ motion **nhẹ** (duration ~0.2s, `easeOut`), đúng guideline trong `theme-config`.

---

## 7) Cấu trúc file gợi ý

```txt
src/pages/dashboard/
  DashboardPage.tsx
  components/
    DashboardSidebar.tsx
    DashboardTopBar.tsx
    ProjectGrid.tsx
    ProjectCard.tsx
    CreateProjectModal.tsx
    DashboardEmptyState.tsx
```

---

## 8) Tóm tắt checklist

| Hạng mục | Yêu cầu |
|----------|---------|
| Sidebar | Logo, 3 mục điều hướng, glass xanh nhạt |
| Top bar | Tìm kiếm + avatar xanh |
| Main | Tiêu đề "Dự án của bạn" + nút tạo mới |
| Grid | GlassCard / gradient / meta + stagger motion |
| API | GET `/api/projects`, POST `/api/projects` + Bearer |
| Empty | Illustration + CTA tạo dự án đầu tiên |
| Modal tạo | GlassCard + tên dự án → POST |
