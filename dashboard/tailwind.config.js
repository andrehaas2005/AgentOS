/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        panel: "#12141c",
        surface: "#181b26",
        border: "#252838",
      },
    },
  },
  plugins: [],
};
