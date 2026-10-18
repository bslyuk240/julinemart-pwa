import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // category-display.ts and other lib helpers use dynamic bg-* classes; scan lib so they are not purged
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
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
        m: {
          primary: 'var(--m-primary)',
          'on-primary': 'var(--m-on-primary)',
          'primary-container': 'var(--m-primary-container)',
          'on-primary-container': 'var(--m-on-primary-container)',
          tertiary: 'var(--m-tertiary)',
          'on-tertiary': 'var(--m-on-tertiary)',
          'tertiary-container': 'var(--m-tertiary-container)',
          'on-tertiary-container': 'var(--m-on-tertiary-container)',
          surface: 'var(--m-surface)',
          'surface-lowest': 'var(--m-surface-lowest)',
          'surface-low': 'var(--m-surface-low)',
          'surface-container': 'var(--m-surface-container)',
          'surface-high': 'var(--m-surface-high)',
          'on-surface': 'var(--m-on-surface)',
          'on-surface-variant': 'var(--m-on-surface-variant)',
          outline: 'var(--m-outline)',
          'outline-variant': 'var(--m-outline-variant)',
          success: 'var(--m-success)',
          'success-container': 'var(--m-success-container)',
          error: 'var(--m-error)',
          scrim: 'var(--m-scrim)',
          'inverse-surface': 'var(--m-inverse-surface)',
          'inverse-on-surface': 'var(--m-inverse-on-surface)',
          'inverse-primary': 'var(--m-inverse-primary)',
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
      // Mobile tier (docs/mobile-tier-plan.md §5). Values live as --m-* CSS vars in globals.css.
      // Prefixed `m-` so they never collide with the existing desktop palette.
      fontSize: {
        'm-headline-s': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'm-title-l': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'm-title-m': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'm-title-s': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'm-body-l': ['16px', { lineHeight: '24px' }],
        'm-body-m': ['14px', { lineHeight: '20px' }],
        'm-body-s': ['12px', { lineHeight: '16px' }],
        'm-label-l': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'm-label-m': ['12px', { lineHeight: '16px', fontWeight: '600' }],
        'm-label-s': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      zIndex: {
        'm-header': '30',
        'm-bar': '40',
        'm-float': '50',
        'm-scrim': '60',
        'm-sheet': '70',
        'm-system': '80',
      },
      borderRadius: {
        'm-card': '12px',
        'm-image': '16px',
        'm-sheet': '28px',
      },
      transitionTimingFunction: {
        'm-standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'm-decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        'm-accelerate': 'cubic-bezier(0.3, 0, 0.8, 0.15)',
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
