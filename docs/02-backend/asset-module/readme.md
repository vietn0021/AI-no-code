# Asset Module

## 1) Muc tieu

Asset Module quan ly cac tai nguyen hinh anh/media va metadata phuc vu qua trinh tao game.  
Ngoai file asset, module nay can co tap mau mau (palette) va bo hinh co ban de AI/frontend tai su dung.

---

## 2) Palettes (Mau mau tham khao)

Duoi day la bo palette mau de he thong co the chon mac dinh khi prompt khong chi dinh ro mau:

### 2.1 Lavender Palette

- `#E6E6FA` (Primary Lavender)
- `#F3E5F5` (Pastel Background)
- `#C8A2C8`
- `#B39DDB`
- `#9575CD`

### 2.2 Mint Palette

- `#98FF98`
- `#B8F2E6`
- `#A8E6CF`
- `#7FD8BE`
- `#4ECDC4`

### 2.3 Peach Palette

- `#FFDAB9`
- `#FFCBA4`
- `#FFB7A5`
- `#F8C8DC`
- `#F4A261`

### 2.4 Sky Palette

- `#87CEEB`
- `#BDE0FE`
- `#A2D2FF`
- `#90CAF9`
- `#64B5F6`

---

## 2.5 Đồng bộ với Studio (frontend)

- Inspector Studio dùng cùng bộ palette tham chiếu (`ASSET_PALETTES` trong `InspectorPanel.tsx`, đồng bộ ý tưởng với các palette dưới đây).
- Entity **sprite** trên canvas: `type: 'sprite'` + `assetUrl` (URL hoặc data URL) — render `<img>` + `object-fit: contain`; có thể thêm thủ công từ tab **Assets** trong editor (xem `docs/03-frontend/studio-editor/readme.md`).

---

## 3) Quy tac xu ly mau sac (bat buoc)

**Quy dinh chinh thuc:**

> He thong ho tro moi ma mau HEX. Neu nguoi dung co prompt ve mau sac, hay uu tien prompt do. Neu khong, moi chon ngau nhien tu bo mau mau.

### Huong dan thuc thi

1. Phan tich prompt:
   - Neu prompt co yeu cau mau cu the (vi du: `#FF0000`, `lavender`, `blue pastel`) -> uu tien dung theo prompt.
2. Neu prompt khong de cap mau:
   - Chon ngau nhien 1 palette trong danh sach mau mau.
   - Chon `primary/background/accent` tu palette da chon.
3. Luon validate HEX:
   - Dinh dang hop le: `#RRGGBB`.
   - Neu gia tri mau khong hop le, fallback ve mau trong palette.

---

## 4) Shapes co ban

Danh sach hinh dang co ban can ho tro:

- `Square`
- `Circle`
- `Triangle`

### Goi y model du lieu

- `shapeType: 'Square' | 'Circle' | 'Triangle'`
- `colorHex: string` (HEX)
- `size: number`
- `position: { x: number; y: number }`

---

## 5) Ghi chu cho AI/Backend

- Khong gioi han he thong vao bo mau co san; palette chi la fallback.
- Neu prompt xung dot mau (vi du vua "lavender" vua "#00FF00"), uu tien gia tri cu the hon.
- Can log ro nguon mau duoc chon:
  - `source = prompt` hoac `source = palette_fallback`.

---

## 6) Upload file & phục vụ tĩnh (Studio / Phaser)

- **POST** `/api/assets/upload?projectId=...` — `multipart/form-data`, field **`file`**; ảnh PNG/JPEG/GIF/WebP, giới hạn kích thước (xem `asset-upload.options.ts`). JWT bắt buộc.
- File lưu dưới thư mục `uploads/` trên server; **`main.ts`** mount static **`/uploads/`** với CORS cho frontend dev (`http://localhost:5173`).
- Entity trong `gameConfig` có thể dùng **`assetUrl`** dạng `/uploads/...` — Phaser Play (`GameRuntime` / `BehaviorRuntime`) resolve sang origin backend (port **3001**).
