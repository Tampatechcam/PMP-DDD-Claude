import type { Metadata } from 'next'
import { WebVitals } from '@/lib/axiom/client'
import { VercelTelemetry } from '@/components/observability/VercelTelemetry'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'PMP Dashboard',
  description: 'Client portal for PMP direct mail and digital orders.'
}

// Loaded as a CSS variable (--font-sans) so globals.css can point the base
// font-family at it. Previously "Inter" was only named in CSS, so most users
// fell back to system-ui; this ships the real typeface to every screen.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans'
})

/**
 * Inline theme-init script. Runs before paint so a saved `dark` choice
 * doesn't flash light. `system` is the default and respects the OS
 * preference; explicit `light` / `dark` always win.
 *
 * Reads from localStorage('pmp-theme'). Keep in sync with ThemeToggle.
 */
const themeInit = `
(function () {
  try {
    var saved = localStorage.getItem('pmp-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = saved === 'dark' || (saved !== 'light' && prefersDark);
    if (dark) document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <WebVitals />
      <body className="bg-bg text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
        <VercelTelemetry />
      </body>
    </html>
  )
}
