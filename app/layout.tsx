import './globals.css'
import { Fira_Code, Fira_Sans } from 'next/font/google'

export const metadata = {
  metadataBase: new URL('https://backer-sonar.local'),
  title: 'Backer Sonar',
  description:
    'Historical Kickstarter research for evidence-based product investigation.',
}

const firaSans = Fira_Sans({
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const firaCode = Fira_Code({
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
