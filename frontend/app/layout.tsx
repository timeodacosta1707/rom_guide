import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RoM Builder',
  description: 'Simulateur de Build pour Runes of Magic',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-slate-950 text-white antialiased selection:bg-blue-500/30">
        {children}
      </body>
    </html>
  )
}