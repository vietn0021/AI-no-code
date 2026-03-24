# Theme Config

## 1) Muc tieu Theme

Theme frontend theo phong cach **Glassmorphism + Pastel**:

- Nen mau mem, do tuong phan vua du de de doc.
- The/card co hieu ung kinh mo (`backdrop-blur`) + vien mong.
- Hover nhe nhang, uu tien cam giac "floating" thay vi motion manh.

Nguon mau tham chieu chinh:

- Sky Blue: `#BDE0FE`, `#A2D2FF`
- White / Alice Blue: `#FFFFFF`, `#F0F8FF`

---

## 2) Color Tokens (CSS)

Dat token tai `:root` de dung dong bo trong app:

```css
:root {
  --sky-light: #BDE0FE;       /* Sky light */
  --sky-dark: #87CEEB;        /* Sky medium */
  --bg-alice-blue: #F0F8FF;   /* Soft page background */
  --bg-white: #FFFFFF;        /* Base white */
}
```

### Quy tac su dung nhanh

- `sky-light`: background nut/chip/card tone chinh.
- `sky-dark`: emphasis/action state (active/focus/hover).
- `bg-alice-blue`: background tong cua page/section.
- `bg-white`: base layer cho card, input, modal.

---

## 3) Glassmorphism Foundation

### 3.1 Surface style (card/modal/panel)

```css
.glass-surface {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(135, 206, 235, 0.2);
}
```

### 3.2 Notes

- Khong dat opacity qua cao tren text container.
- Neu nen qua sang, them overlay gradient nhe:
  - tu `--bg-alice-blue` sang `--bg-white`.

---

## 4) Tailwind Config

Cap nhat `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sky-light': '#BDE0FE',
        'sky-dark': '#87CEEB',
        'bg-alice-blue': '#F0F8FF',
        'bg-white': '#FFFFFF',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(135, 206, 235, 0.18)',
        'soft-hover': '0 12px 30px rgba(135, 206, 235, 0.26)',
      },
      borderRadius: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
```

### Utility gợi ý

- `bg-sky-light`, `text-sky-dark`
- `bg-bg-alice-blue`, `text-sky-dark`
- `shadow-soft`, `hover:shadow-soft-hover`
- `backdrop-blur-md`, `rounded-glass`

---

## 5) Quy tac Hover & Interaction

Muc tieu: nhe, mem, tranh "giat".

### 5.1 Button/Card hover

- Tang do sang hoac contrast rat nhe (3-6%).
- Shadow doi tu `shadow-soft` -> `shadow-soft-hover`.
- Scale toi da `1.01` (khong nen > `1.02` trong UI pastel).

Goi y class:

```html
class="transition-all duration-200 ease-out hover:shadow-soft-hover hover:-translate-y-0.5"
```

### 5.2 Focus state

- Dung ring mau `sky-dark` voi alpha nhe:
  - `focus-visible:ring-2 focus-visible:ring-sky-dark/35`
- Luon co focus visible cho keyboard accessibility.

### 5.3 Motion guidelines

- Duration: `150ms - 220ms`
- Easing: `ease-out`
- Tranh animation lap vo han tren card/chu.

---

## 6) Tong ket Design Rules

1. Palette uu tien Sky Blue + White, giu tong mau pastel de nhin diu.
2. Glass effect chi dung cho container quan trong (card/modal/sidebar), khong lam toan bo page.
3. Hover phai nhe nhang: shadow mem + movement nho.
4. Token mau dat ten ro rang theo nguu canh (`sky`, `bg`) de de maintain va scale.
