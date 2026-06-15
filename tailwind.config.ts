import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-tajawal)", "system-ui", "sans-serif"],
        display: ["var(--font-reem)", "var(--font-tajawal)", "serif"],
      },
      colors: {
        ink: "#16302B",
        parchment: "#EFF2F1",
        primary: {
          DEFAULT: "#1F7A63",
          dark: "#155E4C",
          light: "#E4F0EC",
        },
        gold: "#B6862C",
        line: "#D7DEDB",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,48,43,0.04), 0 8px 24px rgba(22,48,43,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
