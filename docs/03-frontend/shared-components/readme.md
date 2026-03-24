# Shared Components

## 1) Muc tieu

Bo component dung chung cho UI theo phong cach:

- Glassmorphism + Pastel (dong bo voi `theme-config`)
- Reusable, composable, de scale cho dashboard/studio/auth flow
- Uu tien motion nhe: hover scale toi da `1.01`, shadow mem

Khuyen khich:

- **shadcn/ui** lam base primitives
- **framer-motion** cho floating/hover micro-interactions

---

## 2) Component Catalog

## 2.1 GlassCard

### Vai tro

Container nen tang cho panel/card/modal/sidebar block.

### Style key

- class co san: `.glass-surface`
- `rounded-glass`
- `shadow-soft`
- `border border-white/30`

### Props de xuat

- `children`
- `className?`
- `as?: 'div' | 'section' | 'article'`
- `interactive?: boolean` (bat hover/floating nhe)

### Tailwind class goi y

```txt
glass-surface rounded-glass shadow-soft p-4 md:p-6
```

Neu `interactive=true`:

```txt
transition-all duration-200 ease-out hover:shadow-soft-hover hover:-translate-y-0.5
```

---

## 2.2 PastelButton

Button dung chung theo 3 variants:

### `primary`

- Nen: `sky-light`
- Text: `sky-dark`
- Hover: sang hon nhe + soft shadow

Class goi y:

```txt
bg-sky-light text-sky-dark hover:shadow-soft-hover
```

### `secondary`

- Nen: `sky-dark`
- Text: trang
- Hover: dam nen nhe + soft shadow

Class goi y:

```txt
bg-sky-dark text-white hover:brightness-95 hover:shadow-soft-hover
```

### `ghost`

- Khong nen (transparent)
- Co border nhe hoac khong border tuy context
- Hover co shadow + background alpha rat nhe

Class goi y:

```txt
bg-transparent text-sky-dark hover:bg-white/20 hover:shadow-soft
```

### Props de xuat

- `variant: 'primary' | 'secondary' | 'ghost'`
- `size: 'sm' | 'md' | 'lg'`
- `loading?: boolean`
- `leftIcon?`, `rightIcon?`
- `asChild?` (de dung voi shadcn/ui Slot)

---

## 2.3 SmartInput

### Vai tro

Input field dung chung cho form login/register/search/settings.

### Style key

- Bo tron: `rounded-xl` (hoac `rounded-glass` neu muon dong bo manh)
- Nen sang nhe, border mong
- Focus ring: `sky-dark/35`

Class goi y:

```txt
rounded-xl border border-white/40 bg-white/60 px-4 py-2.5
text-slate-700 placeholder:text-slate-400
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/35
```

### Props de xuat

- `label?`, `helperText?`, `error?`
- `prefixIcon?`, `suffixIcon?`
- `isLoading?` (disabled + spinner nho)

---

## 2.4 LoadingState

### Vai tro

Trang thai loading chung cho card/list/button/page section.

### Quy tac motion

- Pulse nhe, khong nhap nhay manh
- Chu ky ~`1.2s - 1.8s`
- Mau theo pastel (`sky-light`, `bg-alice-blue`, `sky-dark/30`)

### Giai phap de xuat

- Skeleton block + `animate-pulse`
- Hoac `framer-motion` opacity tween nhe

Class goi y:

```txt
animate-pulse rounded-xl bg-sky-light/45
```

---

## 2.5 Avatar / IconWrapper

### Vai tro

Vong tron chua icon/avatar de tao diem nhan nhan dien.

### Style key

- Dang tron: `rounded-full`
- Nen pastel nhat
- Co ring/trang vien mong de tach khoi nen

Class goi y:

```txt
inline-flex items-center justify-center rounded-full
bg-sky-light/70 text-sky-dark
ring-1 ring-white/40
```

### Sizes de xuat

- `sm`: 28px
- `md`: 36px
- `lg`: 44px

---

## 3) Quy tac ky thuat (shadcn/ui + framer-motion)

### 3.1 shadcn/ui

- Dung primitives cua shadcn/ui:
  - `Button` -> wrap thanh `PastelButton`
  - `Input` -> wrap thanh `SmartInput`
  - `Card` -> wrap thanh `GlassCard`
- Tranh duplicate logic state/loading.
- Dung `class-variance-authority (cva)` cho variants.

### 3.2 framer-motion

Ap dung cho component co tuong tac:

- Hover scale: toi da `1.01`
- Floating: translateY nho (`-2px` den `-4px`) cho card quan trong
- Duration ngan (`0.18 - 0.22s`), `easeOut`

Pseudo config:

```ts
whileHover={{ scale: 1.01, y: -2 }}
transition={{ duration: 0.2, ease: 'easeOut' }}
```

---

## 4) Accessibility checklist

- Contrast text/nen dat muc doc tot (dac biet voi nen glass trong suot).
- Luon co `focus-visible` cho keyboard.
- Button/loading state co `aria-busy`, `aria-disabled` khi can.
- Input co ket noi `label` va `aria-invalid` neu loi.

---

## 5) Naming convention de xuat

- File:
  - `glass-card.tsx`
  - `pastel-button.tsx`
  - `smart-input.tsx`
  - `loading-state.tsx`
  - `icon-wrapper.tsx`
- Export barrel:
  - `src/components/shared/index.ts`

---

## 6) Tong ket

Bo `Shared Components` nay la lop giao dien co ban cho toan bo frontend:

- Co ngon ngu design dong nhat (pastel + glass)
- Co variants ro rang de scale nhanh
- Co motion nhe va accessibility co ban
- San sang cho Dashboard, Auth Flow, va Studio Editor.
