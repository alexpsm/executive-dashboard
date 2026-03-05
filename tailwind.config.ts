import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fjalla)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Boxing News Brand Colors
        brand: {
          red: '#ed1d23',
          'red-dark': '#c91920',
          'red-light': '#ff3d42',
          gold: '#ceb14f',
          'gold-dark': '#b89a3d',
          'gold-light': '#dcc56a',
          dark: '#161616',
          light: '#f3f3f3',
        },
        // Legacy aliases for compatibility
        cream: {
          50: '#fafafa',
          100: '#f3f3f3',
          200: '#e8e8e8',
          300: '#d4d4d4',
        },
        gold: {
          400: '#dcc56a',
          500: '#ceb14f',
          600: '#b89a3d',
        },
        navy: {
          800: '#1f1f1f',
          900: '#161616',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.12)',
      },
      animation: {
        'gradient-x': 'gradient-x 1.5s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { 'box-shadow': '0 0 5px rgba(237, 29, 35, 0.5), 0 0 10px rgba(206, 177, 79, 0.3)' },
          '50%': { 'box-shadow': '0 0 15px rgba(237, 29, 35, 0.8), 0 0 25px rgba(206, 177, 79, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
