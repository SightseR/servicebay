/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#14171a',
        panel: '#1b1f23',
        'panel-alt': '#202428',
        steel: '#2a2f34',
        'steel-light': '#383e44',
        ink: '#eae7e0',
        muted: '#8a9098',
        amber: { DEFAULT: '#e0a339', dim: '#b9822c', bright: '#f2b755' },
        rust: '#c1573f',
        moss: '#5f8f5a',
      },
      fontFamily: {
        display: ['"Oswald"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        plate: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '2px', DEFAULT: '3px' },
      letterSpacing: { plate: '0.08em' },
    },
  },
  plugins: [],
};
