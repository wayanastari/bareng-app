/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,tsx,ts,jsx}", "./components/**/*.{js,tsx,ts,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#AC1754",
        secondary: "#E53888",
        third: "#EBE8DB",
        fourth: "#B03052",
        text_color: "#3D0301",
        wht: "#FBF8EF",
      },
    },
  },
  plugins: [],
};
