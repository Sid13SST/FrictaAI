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
          DEFAULT: "#7342E2",
          foreground: "#FFFFFF",
        },
        background: {
          DEFAULT: "#050505",
          alt: "#080808",
          deep: "#0B0B0B",
        },
        card: {
          DEFAULT: "#101010",
          hover: "#131313",
        },
        accent: {
          DEFAULT: "#7342E2",
          secondary: "#9B72FA",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#CFCFCF",
          tertiary: "#8E8E8E",
          quaternary: "#5F5F5F",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(115, 66, 226, 0.45)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Urbanist', 'Space Grotesk', 'system-ui', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
