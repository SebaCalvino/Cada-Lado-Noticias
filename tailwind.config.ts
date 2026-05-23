import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Cada Lado
        'cada-blue': '#0052CC',
        'cada-blue-bright': '#3D85FF',
        'cada-dark': '#0F172A',
        'cada-light': '#F8FAFC',
        // Paleta brand legacy (mantener para compatibilidad)
        brand: {
          50:  '#e6eeff',
          100: '#ccdcff',
          300: '#7aa3ff',
          500: '#0052CC',
          600: '#0047b3',
          700: '#003b99',
          900: '#002166',
        },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans:  ['var(--font-sans-body)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)', 'IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
