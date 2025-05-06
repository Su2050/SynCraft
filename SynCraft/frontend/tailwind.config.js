/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',   // ← 扫描所有组件/脚本
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
