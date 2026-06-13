import type { Config } from 'tailwindcss'

/**
 * Color tokens are wired to CSS variables (declared in app/globals.css) so
 * the same `bg-bg` / `text-ink` class strings flip between light and dark
 * themes via the `.dark` class on <html>. The legacy hex values
 * (#FAFAF9, #1C1917, #1E3A5F, …) survive verbatim as the `:root` value for
 * each variable, so nothing visually changes in the default theme.
 *
 * Components that need an alpha (`bg-accent/5`) keep working because each
 * variable is declared as a space-separated `R G B` triplet and read with
 * `rgb(var(--token) / <alpha-value>)`.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg:      'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        border:  'rgb(var(--border) / <alpha-value>)',
        ink:     'rgb(var(--ink) / <alpha-value>)',
        muted:   'rgb(var(--muted) / <alpha-value>)',
        accent:  'rgb(var(--accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--accent-strong) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger:  'rgb(var(--danger) / <alpha-value>)'
      },
      fontFamily: { sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '6px', lg: '12px', xl: '16px', '2xl': '20px' },
      boxShadow: {
        card:        'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        popover:     'var(--shadow-popover)'
      },
      keyframes: {
        'fade-in':  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'shimmer':  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }
      },
      animation: {
        'fade-in':  'fade-in 160ms ease-out',
        'slide-up': 'slide-up 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':  'shimmer 1.4s linear infinite'
      }
    }
  },
  plugins: []
}

export default config
