import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Cookie Notice',
  description: 'What cookies and browser storage Backer Sonar uses for authentication and preferences.',
  ...pageMetadata('/cookies'),
}

export default function CookiesPage() {
  return <PolicyPage label="Policy" title="Cookie notice" lastUpdated="2026-08-22"><p>Backer Sonar uses essential cookies for authenticated sessions. The app may also use browser storage for theme preferences and anonymous saved research.</p><p>Authentication and saved workspace behavior require these essential technologies. We do not use advertising cookies.</p></PolicyPage>
}
