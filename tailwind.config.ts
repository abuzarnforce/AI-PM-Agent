import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d10",
        panel: "#14171c",
        border: "#262b33",
        accent: "#5b8def",
      },
    },
  },
  plugins: [],
};

export default config;
