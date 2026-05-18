/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5", // Indigo-600
          foreground: "#ffffff",
        },
        background: "#09090b", // Zinc-950
        foreground: "#fafafa", // Zinc-50
        card: {
          DEFAULT: "#18181b", // Zinc-900
          foreground: "#fafafa",
        },
        border: "#27272a", // Zinc-800
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}
