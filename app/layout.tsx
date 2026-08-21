import './globals.css'
import { Suspense } from 'react'
import { Fira_Code, Fira_Sans } from 'next/font/google'
import AppNavbar from '@/components/app-navbar'
import OnboardingProvider from '@/components/onboarding-provider'
import SiteFooter from '@/components/site-footer'
import { getCurrentUser } from '@/lib/auth'

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('backer-sonar-theme');
                  var theme = stored === 'light' || stored === 'dark'
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.dataset.theme = theme;
                } catch (error) {
                  document.documentElement.dataset.theme = 'dark';
                }
              })();
            `,
          }}
        />
        <Suspense fallback={null}>
          <AppNavbar user={user} />
        </Suspense>
        <Suspense fallback={null}>
          <OnboardingProvider user={user} />
        </Suspense>
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
