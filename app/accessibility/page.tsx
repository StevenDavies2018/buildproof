import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export default function AccessibilityPage() {
  return <PolicyPage label="Support" title="Accessibility"><p>We are building Backer Sonar to be usable with keyboard navigation, readable contrast, responsive layouts, and clear labels.</p><p>If you encounter an accessibility barrier, contact support@backersonar.com and tell us what happened so we can improve the experience.</p></PolicyPage>
}
