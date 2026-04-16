/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Nunito", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        cream: {
          50: "#FEFCF8",
          100: "#FAF6EF",
          200: "#F3ECDF",
          300: "#E8DFCB",
        },
        ink: {
          900: "#2C1E13",
          700: "#4A3726",
          500: "#70563D",
        },
        terracotta: {
          400: "#E0916E",
          500: "#C96F4A",
          600: "#A85634",
          700: "#82401F",
        },
        espresso: {
          900: "#1A1410",
          800: "#241C17",
          700: "#2F251E",
        },
        amber: {
          accent: "#E8A86B",
        },
      },
      borderRadius: {
        chat: "1.25rem",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        blink: {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "96%": { transform: "scaleY(0.1)" },
        },
        bounce_dot: {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        blink: "blink 5s ease-in-out infinite",
        "bounce-dot": "bounce_dot 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
