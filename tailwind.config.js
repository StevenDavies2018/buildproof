/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        default: ['var(--font-sans)'],
      },
      colors: {
        bs: {
          primary: 'var(--bs-primary)',
          secondary: 'var(--bs-secondary)',
          accent: 'var(--bs-accent)',
          background: 'var(--bs-background)',
          foreground: 'var(--bs-foreground)',
          muted: 'var(--bs-muted)',
          border: 'var(--bs-border)',
          panel: 'var(--bs-panel)',
          panelAlt: 'var(--bs-panel-alt)',
        },
      },
    },
  },
  plugins: [],
}
