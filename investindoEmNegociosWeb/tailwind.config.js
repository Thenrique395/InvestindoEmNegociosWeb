/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        // Corpo e UI. Títulos e valores usam `font-display` (Poppins).
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: 'var(--fw-regular)',
        medium: 'var(--fw-medium)',
        semibold: 'var(--fw-semibold)',
        bold: 'var(--fw-bold)',
      },
    },
  },
  plugins: [],
};
