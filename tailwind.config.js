/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#090C0A',
        panel: '#101613',
        panel2: '#0C120F',
        line: '#1E2A24',
        mint: '#34E39A',
        mintdim: '#1C7A56',
        amber: '#F5B451',
        rose: '#F0777C',
        fog: '#7E8B84',
        chalk: '#E8EDEA',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(52,227,154,0.25), 0 8px 40px -12px rgba(52,227,154,0.25)',
      },
    },
  },
  plugins: [],
}
