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
        // ── Fricta Primary Accent ──────────────────────────────────────────────
        primary: {
          DEFAULT: "#5ed29c",
          foreground: "#070b0a",
          muted: "rgba(94,210,156,0.12)",
          border: "rgba(94,210,156,0.22)",
        },
        // ── Fricta Core Palette ────────────────────────────────────────────────
        background: "#070b0a",
        foreground: "#fafafa",
        accent: "#5ed29c",
        "hero-sub": "hsl(var(--hero-sub, 40 6% 82%))",

        // ── Obsidian Surface Scale ─────────────────────────────────────────────
        obsidian: {
          DEFAULT: "#09090b",
          deep: "#050507",
          mid: "#0d0d11",
          surface: "#111114",
        },

        // ── Card / UI Surfaces ─────────────────────────────────────────────────
        card: {
          DEFAULT: "#0d0d11",
          foreground: "#fafafa",
        },
        border: "#27272a",

        // ── Semantic Agent Role Accents ────────────────────────────────────────
        // Used ONLY as subtle indicators: badges, dots, timeline points
        "agent-visual":       "#10b981",  // Emerald   — Visual Agent
        "agent-nav":          "#ec4899",  // Pink      — Navigation Agent
        "agent-cognitive":    "#eab308",  // Amber     — Cognitive Agent
        "agent-onboarding":   "#06b6d4",  // Cyan      — Onboarding Agent
        "agent-discover":     "#8b5cf6",  // Violet    — Discoverability Agent
        "agent-workflow":     "#84cc16",  // Lime      — Workflow Agent
        "agent-orchestrator": "#5ed29c",  // Mint      — Orchestrator
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        inter:   ['Inter', 'system-ui', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif:   ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'mint-glow':        '0 0 20px rgba(94, 210, 156, 0.15)',
        'mint-glow-strong': '0 0 30px rgba(94, 210, 156, 0.25)',
        'mint-glow-sm':     '0 0 10px rgba(94, 210, 156, 0.10)',
        'obsidian-panel':   '0 8px 48px rgba(0,0,0,0.65)',
      },
    },
  },
  plugins: [],
}
