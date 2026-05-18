/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5",
          foreground: "#ffffff",
        },
        background: "#09090b",
        foreground: "#fafafa",
        card: {
          DEFAULT: "#18181b",
          foreground: "#fafafa",
        },
        border: "#27272a",
      },
    },
  },
  plugins: [],
}
