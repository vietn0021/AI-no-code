/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
      colors: {
        'sky-light': '#BDE0FE',
        'sky-dark': '#87CEEB',
        'bg-alice-blue': '#F0F8FF',
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
