/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed",
        secondary: "#2dd4bf",
        accent: "#f43f5e",
        background: "#030014",
      },
    },
  },
  plugins: [],
}
