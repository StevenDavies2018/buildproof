import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Legal Disclaimer',
  description: "Important limitations and disclaimers about Backer Sonar's Kickstarter research data and analysis.",
  ...pageMetadata('/legal-disclaimer'),
}

export default function LegalDisclaimerPage() {
  return (
    <PolicyPage label="Policy" title="Legal disclaimer" lastUpdated="2026-08-22">
      <p>
        Backer Sonar provides historical Kickstarter research, filtering, normalization,
        and comparison tools for informational and product-research purposes only.
      </p>
      <p>
        The service does not provide legal advice, financial advice, investment advice,
        tax advice, or guarantees about campaign performance, market demand, funding
        outcomes, or business success.
      </p>
      <p>
        Deterministic scores, research slices, normalized currency values, and campaign
        comparisons should be treated as decision support. You are responsible for your
        own interpretation, due diligence, launch decisions, and compliance obligations.
      </p>
      <p>
        Historical data may contain source limitations, missing fields, classification
        edge cases, or incomplete currency comparability. Where those limitations are
        known, Backer Sonar should surface them as warnings or confidence signals, but
        no research output should be treated as a warranty.
      </p>
    </PolicyPage>
  )
}
