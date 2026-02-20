import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        luxury: {
          50: '#fdfcf7',
          100: '#f9f6eb',
          200: '#f0e8cc',
          300: '#e2d09d',
          400: '#d0b56c',
          500: '#c09a44',
          600: '#a67d35',
          700: '#86612a',
          800: '#6b4c22',
          900: '#58401e',
        },
        gold: {
          50: '#fdfaf0',
          100: '#faf3d6',
          200: '#f2e4a8',
          300: '#e6cf72',
          400: '#d4b96a',
          500: '#C09A44',
          600: '#a67d35',
          700: '#86612a',
          800: '#6b4c22',
          900: '#58401e',
          DEFAULT: '#C09A44',
          light: '#D4B96A',
          dark: '#A67D35',
        },
        sidebar: {
          DEFAULT: '#1a1a1a',
          foreground: '#f5f5f5',
          accent: '#C09A44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        luxury: '0.75rem',
      },
      boxShadow: {
        luxury: '0 4px 24px -4px rgba(192, 154, 68, 0.15)',
        card: '0 2px 12px -2px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
