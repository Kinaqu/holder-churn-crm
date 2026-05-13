import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#07090d",
          900: "#0c1118",
          850: "#101722",
          800: "#151e2b",
          700: "#223044"
        },
        signal: {
          cyan: "#41d7c8",
          green: "#71f0a3",
          amber: "#f6c85f",
          rose: "#ff6b7a",
          blue: "#7ab7ff"
        }
      },
      boxShadow: {
        panel: "0 18px 70px rgba(0,0,0,0.34)",
        glow: "0 0 48px rgba(65,215,200,0.16)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
