export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F172A', light: '#1E293B', dark: '#020617' },
        accent: { DEFAULT: '#D4AF37', light: '#E5C158', dark: '#B8941F' },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif']
      }
    }
  }
}
