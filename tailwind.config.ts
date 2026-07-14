import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          black: "#03050A",
          darker: "#020409",
          light: "#09101B",
          panel: "#0B1320",
        },
        cyber: {
          blue: "#29B6F6",
          cyan: "#70E7FF",
          glow: "#8FE8FF",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "scan-line": "scan-line 4.5s linear infinite",
        "fade-in": "fade-in 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in-up": "fade-in-up 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
        "rotate-slow": "rotate-slow 28s linear infinite",
        "float": "float 9s ease-in-out infinite",
        "data-flow": "data-flow 4s ease-in-out infinite",
        "blink": "blink 1.5s step-end infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "data-flow": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(112, 231, 255, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(112, 231, 255, 0.025) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "50px 50px",
      },
    },
  },
  plugins: [],
};

export default config;
