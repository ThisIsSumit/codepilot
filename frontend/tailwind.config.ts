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
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#080b0f',
        surface: '#0d1117',
        'surface-2': '#161b22',
        signal: '#63d2ff',
        critical: '#ff5f57',
        warning: '#ffbd2e',
        success: '#1afa9b',
      },
    },
  },
  plugins: [],
}

export default config
