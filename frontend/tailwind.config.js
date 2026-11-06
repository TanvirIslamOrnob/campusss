export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
    colors: {
      navy: { 950: '#0A1030', 900: '#0F1A4A', 800: '#17246B' },
      volt: { 400: '#9B6BFF', 500: '#7C3AED', 600: '#6D28D9' },
      paper: '#F7F8FC', mist: '#E8EAF2'
    }
  } },
  plugins: []
};
