import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Accessibility',
  description: "Backer Sonar's commitment to accessible design and how to report accessibility issues.",
  alternates: { canonical: '/accessibility' },
}

export default function AccessibilityPage() {
  return <PolicyPage label="Support" title="Accessibility" lastUpdated="2026-08-22"><p>We are building Backer Sonar to be usable with keyboard navigation, readable contrast, responsive layouts, and clear labels.</p><p>If you encounter an accessibility barrier, contact support@backersonar.com and tell us what happened so we can improve the experience.</p></PolicyPage>
}
