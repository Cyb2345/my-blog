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
        ink: "var(--color-text)",
        paper: "var(--color-bg)",
        moss: "var(--color-success)",
        ocean: "var(--color-primary)",
        clay: "var(--color-danger)",
        honey: "var(--color-warning)",
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        card: "var(--surface-card)",
        soft: "var(--color-surface-muted)",
        border: "var(--color-border)",
        foreground: "var(--color-text)",
        muted: "var(--color-text-subtle)",
        primary: "var(--color-primary)",
      },
      boxShadow: {
        soft: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};

export default config;
