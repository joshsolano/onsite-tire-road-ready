import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red:        '#C41230',
          'red-dark': '#A10E27',
          'red-light':'#FEF2F2',
          black:      '#0A0A0A',
          'gray-900': '#1A1A1A',
          'gray-700': '#3A3A3A',
          'gray-500': '#6B6B6B',
          'gray-300': '#C0C0C0',
          'gray-100': '#F2F2F2',
        },
        risk: {
          severe: '#B91C1C',
          high:   '#C2410C',
          moderate:'#854D0E',
          low:    '#15803D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      keyframes: {
        'tire-roll': {
          '0%':   { transform: 'translateX(-100%) rotate(0deg)' },
          '100%': { transform: 'translateX(200vw) rotate(720deg)' },
        },
        'track-appear': {
          '0%':   { opacity: '0', width: '0%' },
          '100%': { opacity: '1', width: '100%' },
        },
        'stamp': {
          '0%':   { transform: 'scale(1.4)', opacity: '0' },
          '60%':  { transform: 'scale(0.9)', opacity: '1' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'tire-roll':    'tire-roll 2s ease-in-out forwards',
        'track-appear': 'track-appear 0.8s ease-out forwards',
        'stamp':        'stamp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'fade-up':      'fade-up 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
