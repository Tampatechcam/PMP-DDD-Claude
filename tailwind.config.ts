import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF9',
        surface: '#FFFFFF',
        border: '#E7E5E4',
        ink: '#1C1917',
        muted: '#78716C',
        accent: '#1E3A5F',
        success: '#15803D',
        warning: '#B45309',
        danger: '#B91C1C'
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '6px', lg: '10px' }
    }
  },
  plugins: []
}

export default config
