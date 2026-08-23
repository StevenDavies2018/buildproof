import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Backer Sonar collects, stores, and protects your account and research data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <PolicyPage label="Policy" title="Privacy" lastUpdated="2026-08-22"><p>Backer Sonar uses account information to provide sign-in, saved research, and workspace features. We do not sell personal information.</p><p>Account and saved-item data is stored with our managed database provider using standard encryption in transit and at rest. Contact support@backersonar.com with privacy questions or requests.</p></PolicyPage>
}
