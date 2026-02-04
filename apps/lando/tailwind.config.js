/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./src/**/*.css"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Fira Code'", "'Courier New'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        lando: {
          bg: "#0a0f0a", // Deep forest green/black
          card: "#0d1a0d", // Dark green card
          accent: "#22c55e", // Green accent (Lando's vest)
          glow: "#4ade80", // Bright green glow
          text: "#e8fce8", // Light green-tinted text
          muted: "#86a786", // Muted green
          border: "#1a3a1a", // Green border
        },
        "lando-bg": "#0a0f0a", // Deep forest green/black
        matrix: {
          green: "#00ff41",
        },
      },
      animation: {
        "matrix-scan": "matrixScan 8s linear infinite",
        "pulse-green": "pulseGreen 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.6s ease-out",
      },
      keyframes: {
        matrixScan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        pulseGreen: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 5px #22c55e" },
          "50%": { opacity: "0.8", boxShadow: "0 0 20px #4ade80" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      backgroundImage: {
        "matrix-gradient":
          "linear-gradient(180deg, rgba(0,255,65,0.03) 0%, rgba(0,255,65,0) 100%)",
      },
    },
  },
  plugins: [],
};
