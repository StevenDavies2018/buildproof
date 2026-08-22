import './globals.css'
import { Suspense } from 'react'
import Script from 'next/script'
import localFont from 'next/font/local'
import AppNavbar from '@/components/app-navbar'
import OnboardingProvider from '@/components/onboarding-provider'
import SiteFooter from '@/components/site-footer'
import { getCurrentUser, getUserEntitlements } from '@/lib/auth'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-S888QYSB36'

export const metadata = {
  metadataBase: new URL('https://backer-sonar.local'),
  title: 'Backer Sonar',
  description:
    'Historical Kickstarter research for evidence-based product investigation.',
}

const firaSans = localFont({
  variable: '--font-sans',
  display: 'swap',
  src: [
    { path: './fonts/FiraSans-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/FiraSans-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/FiraSans-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/FiraSans-700.woff2', weight: '700', style: 'normal' },
  ],
})

const firaCode = localFont({
  variable: '--font-mono',
  display: 'swap',
  src: [
    { path: './fonts/FiraCode-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/FiraCode-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/FiraCode-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/FiraCode-700.woff2', weight: '700', style: 'normal' },
  ],
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const showAiCopilot = Boolean(user && user.aiCopilotEnabled && getUserEntitlements(user).canUseAiCopilot)
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans`}>
        <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `,
          }}
        />
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
          <AppNavbar user={user} showAiCopilot={showAiCopilot} />
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
