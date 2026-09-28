/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18302b',
        moss: '#527d68',
        cream: '#f5f0e7',
        coral: '#df745d'
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'sans-serif']
      }
    }
  },
  plugins: []
};
