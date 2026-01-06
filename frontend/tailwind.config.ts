import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: 'oklch(0.96 0.03 275)',
            muted: 'oklch(0.80 0.12 275)',
            subtle: 'oklch(0.65 0.20 275)',
            DEFAULT: 'oklch(0.55 0.24 275)',
            emphasis: 'oklch(0.45 0.24 275)',
            inverted: '#ffffff',
          },
          content: {
            DEFAULT: 'oklch(0.175 0.02 280)',
            emphasis: 'oklch(0.145 0.02 280)',
            strong: 'oklch(0.205 0.03 280)',
            subtle: 'oklch(0.50 0.02 270)',
            inverted: 'oklch(0.985 0.01 280)',
          },
        },
        // Extended semantic colors
        success: {
          50: 'oklch(0.97 0.03 150)',
          100: 'oklch(0.94 0.06 150)',
          200: 'oklch(0.88 0.10 150)',
          300: 'oklch(0.80 0.14 150)',
          400: 'oklch(0.72 0.17 150)',
          500: 'oklch(0.65 0.20 150)',
          600: 'oklch(0.55 0.18 150)',
          700: 'oklch(0.45 0.15 150)',
          800: 'oklch(0.35 0.12 150)',
          900: 'oklch(0.25 0.08 150)',
        },
        warning: {
          50: 'oklch(0.98 0.03 75)',
          100: 'oklch(0.95 0.06 75)',
          200: 'oklch(0.90 0.10 75)',
          300: 'oklch(0.85 0.14 75)',
          400: 'oklch(0.80 0.17 75)',
          500: 'oklch(0.75 0.18 75)',
          600: 'oklch(0.65 0.16 75)',
          700: 'oklch(0.55 0.14 75)',
          800: 'oklch(0.45 0.10 75)',
          900: 'oklch(0.35 0.06 75)',
        },
        indigo: {
          50: 'oklch(0.97 0.02 275)',
          100: 'oklch(0.94 0.04 275)',
          200: 'oklch(0.88 0.08 275)',
          300: 'oklch(0.78 0.14 275)',
          400: 'oklch(0.68 0.20 275)',
          500: 'oklch(0.55 0.24 275)',
          600: 'oklch(0.48 0.22 275)',
          700: 'oklch(0.40 0.18 275)',
          800: 'oklch(0.32 0.14 275)',
          900: 'oklch(0.25 0.10 275)',
          950: 'oklch(0.18 0.06 275)',
        },
        teal: {
          50: 'oklch(0.97 0.02 185)',
          100: 'oklch(0.94 0.04 185)',
          200: 'oklch(0.88 0.08 185)',
          300: 'oklch(0.80 0.12 185)',
          400: 'oklch(0.75 0.15 185)',
          500: 'oklch(0.70 0.18 185)',
          600: 'oklch(0.60 0.16 185)',
          700: 'oklch(0.50 0.14 185)',
          800: 'oklch(0.40 0.10 185)',
          900: 'oklch(0.30 0.06 185)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
