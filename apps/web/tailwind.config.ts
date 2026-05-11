import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        border: 'var(--border)',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Direct surface tokens — match the design's --bg / --bg-elev / --bg-sunk
        bg: 'hsl(var(--bg))',
        'bg-elev': 'hsl(var(--bg-elev))',
        'bg-sunk': 'hsl(var(--bg-sunk))',
        fg: 'hsl(var(--fg))',
        'fg-muted': 'hsl(var(--fg-muted))',
        'fg-subtle': 'hsl(var(--fg-subtle))',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        status: {
          green: 'hsl(var(--status-green))',
          amber: 'hsl(var(--status-amber))',
          red: 'hsl(var(--status-red))',
          blue: 'hsl(var(--status-blue))',
        },
        // CRWLA marketing palette (warm paper editorial)
        mk: {
          paper: '#f3f1ec',
          'paper-deep': '#ebe8df',
          ink: '#0e0e0e',
          'ink-2': '#2a2a2a',
          muted: '#6e6b63',
          subtle: '#a8a49a',
          line: '#d8d3c6',
          'line-strong': '#c4beaf',
          accent: '#ff5e3a',
          'accent-deep': '#e54a26',
          leaf: '#2f4a3a',
          chalk: '#ffffff',
          // dark (About)
          'dark-bg': '#111110',
          'dark-bg-2': '#18181a',
          'dark-ink': '#f5f3ee',
          'dark-ink-2': '#c8c4ba',
          'dark-muted': '#8a857a',
          // light (Contact)
          'light-bg': '#fafaf7',
          'light-panel': '#ffffff',
          'light-ink-2': '#2a2a2a',
          'light-muted': '#6c6c66',
          'light-line': '#e6e3da',
          'light-line-2': '#d4cfc2',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // CRWLA marketing keyframes
        'mk-orbit': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(3px, -2px)' },
          '50%': { transform: 'translate(0, 3px)' },
          '75%': { transform: 'translate(-3px, -1px)' },
        },
        'mk-ping': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(.7)' },
        },
        'mk-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(.6)' },
        },
        'mk-livedot': {
          '0%': { boxShadow: '0 0 0 0 rgba(47,74,58,0.5)' },
          '70%': { boxShadow: '0 0 0 8px rgba(47,74,58,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47,74,58,0)' },
        },
        'mk-blink': { '50%': { opacity: '0' } },
        'mk-kw-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.92)' },
          to: { opacity: '1', transform: 'none' },
        },
        'mk-lane-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'mk-shimmer': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'mk-row-in': { to: { opacity: '1', transform: 'translateY(0)' } },
        'mk-draw-in': { to: { strokeDashoffset: '0' } },
        'mk-float': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(-20px, 30px) scale(1.08)' },
          '66%': { transform: 'translate(30px, -20px) scale(0.95)' },
        },
        'mk-spin': { to: { transform: 'rotate(360deg)' } },
        'mk-drift': {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(-30px, 20px)' },
        },
        'mk-bounce-in': {
          '0%': { transform: 'scale(0) rotate(-30deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(-8deg)', opacity: '1' },
        },
        'mk-fall': {
          '0%': { transform: 'translateY(-20px) scale(0)', opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { transform: 'translateY(220px) scale(1)', opacity: '0' },
        },
        'mk-fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '0.6' } },
        'mk-trace': { to: { strokeDashoffset: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'mk-orbit': 'mk-orbit 3s ease-in-out infinite',
        'mk-ping': 'mk-ping 2.4s ease-in-out infinite',
        'mk-pulse': 'mk-pulse 2s ease-in-out infinite',
        'mk-livedot': 'mk-livedot 1.6s ease-out infinite',
        'mk-blink': 'mk-blink 1s steps(2) infinite',
        'mk-kw-in': 'mk-kw-in 0.4s cubic-bezier(.2,.7,.3,1.2) both',
        'mk-lane-in': 'mk-lane-in 0.35s ease-out both',
        'mk-shimmer': 'mk-shimmer 1.4s linear infinite',
        'mk-row-in': 'mk-row-in 0.5s ease-out forwards',
        'mk-float': 'mk-float 16s ease-in-out infinite',
        'mk-spin': 'mk-spin 30s linear infinite',
        'mk-drift': 'mk-drift 14s ease-in-out infinite',
        'mk-bounce-in': 'mk-bounce-in 0.7s cubic-bezier(.5,1.6,.4,1)',
        'mk-fall': 'mk-fall 1.4s cubic-bezier(.3,.7,.4,1) forwards',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        // marketing fonts (Google) — loaded via next/font in (marketing)/layout
        space: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        instrument: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
        jetbrains: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
