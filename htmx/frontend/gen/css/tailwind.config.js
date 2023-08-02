/** @type {import('tailwindcss').Config} */
module.exports = {
  // darkMode: "class",
  content: {
    files: ["../../**/*.go"],
  },
  plugins: [
    require("@tailwindcss/container-queries"),
    require("@tailwindcss/typography"),
    require("daisyui"),
  ],
  theme: {
    extend: {},
  },
};
