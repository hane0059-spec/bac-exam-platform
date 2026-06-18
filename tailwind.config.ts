import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // المتغيّر المستهلَك يُضبَط ديناميكياً في layout حسب إعداد المدير،
        // مع ارتداد إلى Cairo إن لم يُضبَط.
        sans: ["var(--font-app)", "var(--font-cairo)", "system-ui", "sans-serif"],
        display: ["var(--font-app)", "var(--font-cairo)", "system-ui", "sans-serif"],
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
