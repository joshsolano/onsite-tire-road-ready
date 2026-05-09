import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Road Ready Platform',
  description: 'Professional mobile tire service reports and workflow management.',
  openGraph: {
    title: 'Road Ready Report',
    description: 'Your vehicle is road ready.',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
}

// Script runs before paint to prevent flash of wrong theme
// Only apply dark if explicitly saved — default is always light
const themeScript = `
(function() {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  )
}
