import type { Config } from "tailwindcss";

// Status shades are theme-aware so `text-red-300` etc. stay legible on both
// light and dark surfaces.
const tone = (name: string) => `rgb(var(--tone-${name}) / <alpha-value>)`;
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        panel: token("panel"),
        elevated: token("elevated"),
        border: token("border"),
        accent: { DEFAULT: token("accent"), hover: token("accent-hover") },
        fg: token("fg"),
        muted: token("muted"),
        subtle: token("subtle"),
        red: { 200: tone("red"), 300: tone("red"), 400: tone("red"), 500: tone("red") },
        emerald: { 200: tone("green"), 300: tone("green"), 400: tone("green"), 500: tone("green") },
        amber: { 200: tone("orange"), 300: tone("orange"), 400: tone("orange"), 500: tone("orange") },
        sky: { 200: tone("blue"), 300: tone("blue"), 400: tone("blue"), 500: tone("blue") },
        violet: { 200: tone("purple"), 300: tone("purple"), 400: tone("purple"), 500: tone("purple") },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
