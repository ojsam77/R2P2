/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx}"],
  mode: "jit",
  theme: {
    extend: {
      screens: {
        xs: "450px",
      },
    },
  },
  plugins: [],
}

