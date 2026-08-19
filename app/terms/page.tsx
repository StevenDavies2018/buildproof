import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export default function TermsPage() {
  return <PolicyPage label="Policy" title="Terms of use"><p>Backer Sonar provides research tools and historical campaign data for informational purposes. You are responsible for how you interpret and use the information.</p><p>Do not misuse the service, attempt unauthorized access, or treat research outputs as guarantees of campaign performance.</p></PolicyPage>
}
