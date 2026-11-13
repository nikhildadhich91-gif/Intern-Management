/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        tight: ["'Inter Tight'", "'Inter'", "sans-serif"],
      },
      colors: {
        aurora: {
          ink: "#ffffff",
          bg: "#04121b",
          blue: "#278cf5",
          lime: "#c6e35c",
          olive: "#8fa832",
        },
      },
    },
  },
  plugins: [],
};

