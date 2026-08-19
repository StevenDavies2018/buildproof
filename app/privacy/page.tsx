import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export default function PrivacyPage() {
  return <PolicyPage label="Policy" title="Privacy"><p>Backer Sonar uses account information to provide sign-in, saved research, and workspace features. We do not sell personal information.</p><p>The POC stores account and saved-item data in Neon. Contact support@backersonar.com with privacy questions or requests.</p></PolicyPage>
}
