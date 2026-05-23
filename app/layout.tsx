import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PMP Dashboard',
  description: 'Client portal for PMP direct mail and digital orders.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  )
}
