/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ftc-red': '#790213',
        'ftc-blue': '#0A6CAF',
      },
    },
  },
  plugins: [],
}
