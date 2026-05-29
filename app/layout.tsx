import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'PMP Dashboard',
  description: 'Client portal for PMP direct mail and digital orders.'
}

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
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-bg text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
