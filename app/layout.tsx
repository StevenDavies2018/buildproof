import './globals.css'
import { Suspense } from 'react'
import Script from 'next/script'
import localFont from 'next/font/local'
import AuthChrome from '@/components/auth-chrome'
import SiteFooter from '@/components/site-footer'
import { WebVitalsReporter } from '@/components/web-vitals-reporter'
import { SITE_NAME } from '@/lib/seo'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-S888QYSB36'
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

export const metadata = {
  // `||`, not `??` — APP_URL exists in Vercel but can be set to an empty
  // string rather than being unset, and `new URL('')` throws ERR_INVALID_URL.
  metadataBase: new URL(process.env.APP_URL || 'https://www.backersonar.com'),
  title: {
    default: 'Backer Sonar',
    template: '%s | Backer Sonar',
  },
  description:
    'Historical Kickstarter research for evidence-based product investigation.',
  alternates: {
    canonical: '/',
  },
  // Fallback for any route that doesn't set its own openGraph (metadata
  // objects don't deep-merge, so pages using lib/seo.ts's pageMetadata()
  // override this entirely with their own type/url).
  openGraph: {
    type: 'website' as const,
    siteName: SITE_NAME,
  },
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
  // FiraCode is used for display headings (brand voice), not body copy —
  // preloading all 4 weights on every route added ~90KB to the render-
  // blocking critical path sitewide. `display: 'swap'` already means no
  // flash-of-invisible-text, just a later (non-blocking) font swap.
  preload: false,
  src: [
    { path: './fonts/FiraCode-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/FiraCode-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/FiraCode-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/FiraCode-700.woff2', weight: '700', style: 'normal' },
  ],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        {CLARITY_PROJECT_ID ? (
          <Script
            id="microsoft-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function (c, l, a, r, i, t, y) {
                  c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) };
                  t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
                  y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
                })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
              `,
            }}
          />
        ) : null}
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
          <AuthChrome />
        </Suspense>
        {children}
        <SiteFooter />
        <WebVitalsReporter />
      </body>
    </html>
  )
}
