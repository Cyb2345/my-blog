import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#fffaf3",
        moss: "#5a7f68",
        ocean: "#44708f",
        clay: "#c7775b",
        honey: "#e7b95f",
        background: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--surface-card)",
        soft: "var(--surface-soft)",
        border: "var(--border)",
        foreground: "var(--text)",
        muted: "var(--text-muted)",
        primary: "var(--primary)",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(31, 41, 51, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
