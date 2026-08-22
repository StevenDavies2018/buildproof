import { PolicyPage } from '@/components/policy-page'

export const dynamic = 'force-static'

export default function CookiesPage() {
  return <PolicyPage label="Policy" title="Cookie notice"><p>Backer Sonar uses essential cookies for authenticated sessions. The app may also use browser storage for theme preferences and anonymous saved research.</p><p>Authentication and saved workspace behavior require these essential technologies. We do not use advertising cookies.</p></PolicyPage>
}
