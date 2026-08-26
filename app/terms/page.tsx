import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: "Terms of Use for Backer Sonar's Kickstarter research and reporting tools.",
  ...pageMetadata('/terms'),
}

export default function TermsPage() {
  return <PolicyPage label="Policy" title="Terms of use" lastUpdated="2026-08-22"><p>Backer Sonar provides research tools and historical campaign data for informational purposes. You are responsible for how you interpret and use the information.</p><p>Do not misuse the service, attempt unauthorized access, or treat research outputs as guarantees of campaign performance.</p></PolicyPage>
}
