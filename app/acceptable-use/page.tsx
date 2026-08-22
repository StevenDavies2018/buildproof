import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy',
  description: "Acceptable use guidelines for Backer Sonar's Kickstarter research platform.",
  alternates: { canonical: '/acceptable-use' },
}

export default function AcceptableUsePage() {
  return <PolicyPage label="Policy" title="Acceptable use"><p>Use Backer Sonar lawfully and respectfully. Do not probe, overload, scrape, or interfere with the service or its supporting infrastructure.</p><p>Do not use the product to misrepresent research, target people, or make decisions that require professional financial, legal, or regulatory advice.</p></PolicyPage>
}
