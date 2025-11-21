import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // JulineMart Brand Colors
        primary: {
          50: '#f7e6fb',
          100: '#efd1f7',
          200: '#dfaaee',
          300: '#c86bdc',
          400: '#b033c8',
          500: '#77088a',  // Main brand purple
          600: '#670779',
          700: '#50055d',
          800: '#3c0445',
          900: '#2d0334',
          950: '#1a021f',
        },
        secondary: {
          50: '#fff3e8',
          100: '#ffe3cc',
          200: '#ffc899',
          300: '#ffad66',
          400: '#ff914d',
          500: '#ff7a29',  // Main brand orange
          600: '#f86600',
          700: '#d65500',
          800: '#a84200',
          900: '#7d3200',
          950: '#421900',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(119, 8, 138, 0.1)',
        'card-hover': '0 4px 16px rgba(119, 8, 138, 0.15)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
