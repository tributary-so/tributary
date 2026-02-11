/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lando: {
          bg: "#0a0a0a",
          card: "#171717",
          text: "#fafafa",
          muted: "#a1a1aa",
          accent: "#4ade80",
          "accent-dark": "#22c55e",
          border: "#262626",
        },
        matrix: {
          green: "#22c55e",
        },
      },
      fontFamily: {
        mono: ['"Fira Code"', '"JetBrains Mono"', "monospace"],
      },
    },
  },
};
