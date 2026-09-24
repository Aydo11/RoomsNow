import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
        paper: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          card: "rgb(var(--color-paper-card) / <alpha-value>)",
          sunk: "rgb(var(--color-paper-sunk) / <alpha-value>)",
        },
        // Existing semantic class names are retained to keep the UI stable;
        // these values are the RoomsNow accent-blue palette.
        pine: {
          DEFAULT: "rgb(var(--color-pine) / <alpha-value>)",
          dark: "rgb(var(--color-pine-dark) / <alpha-value>)",
          light: "rgb(var(--color-pine-light) / <alpha-value>)",
        },
        clay: {
          DEFAULT: "rgb(var(--color-clay) / <alpha-value>)",
          light: "rgb(var(--color-clay-light) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--color-line) / <alpha-value>)",
          strong: "rgb(var(--color-line-strong) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px", pill: "999px" },
      boxShadow: {
        raise: "0 1px 2px rgba(15,79,135,.06), 0 8px 24px -12px rgba(15,79,135,.20)",
        float: "0 18px 42px -24px rgba(15,79,135,.34), 0 4px 12px rgba(15,79,135,.10)",
      },
      maxWidth: { shell: "1200px" },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-sheet": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "80%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in-down": "fade-in-down 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-sheet": "slide-up-sheet 0.32s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.2,0.6,0.4,1) infinite",
        "toast-in": "toast-in 0.28s cubic-bezier(0.16,1,0.3,1) both",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
