/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 👈 これでfrontend/srcの中身を全スキャンします
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
