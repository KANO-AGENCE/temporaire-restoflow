import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette ember : ambre profond + braise, fait écho à la déco tamisée brasserie
        brand: {
          50: '#fdf5ef',
          100: '#fae6d4',
          200: '#f3c89f',
          300: '#e9a463',
          400: '#dc8537',
          500: '#c66a1d',
          600: '#a4521a',
          700: '#7e3f17',
          800: '#5c2f12',
          900: '#3e200d',
        },
        // Slate chaud (presque charbon brun) — ambiance lumière tamisée
        ink: {
          50: '#fafaf7',
          100: '#f3f2ed',
          200: '#e0ddd3',
          300: '#c2bdaf',
          400: '#9a9384',
          500: '#6f685b',
          600: '#534d43',
          700: '#3a352d',
          800: '#26221c',
          900: '#15130f',
        },
        accent: {
          burgundy: '#7a1f25',
          gold: '#caa15a',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(21,19,15,0.04), 0 6px 20px rgba(21,19,15,0.06)',
      },
      backgroundImage: {
        'ember-gradient':
          'linear-gradient(135deg, #5c2f12 0%, #7e3f17 35%, #a4521a 100%)',
        'plate-gradient':
          'linear-gradient(180deg, rgba(21,19,15,0.6) 0%, rgba(21,19,15,0.85) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
