import AppNavbar from '@/components/app-navbar'
import OnboardingProvider from '@/components/onboarding-provider'
import { getCurrentUser, getUserEntitlements } from '@/lib/auth'

// Isolates the cookie read (getCurrentUser) behind its own Suspense boundary
// so pages that don't need per-request personalization (e.g. the marketing
// homepage) can still be statically rendered/ISR'd — a cookies() call made
// directly in the root layout body forces every page under it into dynamic
// rendering, regardless of that page's own `revalidate`/`dynamic` config.
export default async function AuthChrome() {
  const user = await getCurrentUser()
  const showAiCopilot = Boolean(user && user.aiCopilotEnabled && getUserEntitlements(user).canUseAiCopilot)

  return (
    <>
      <AppNavbar user={user} showAiCopilot={showAiCopilot} />
      <OnboardingProvider user={user} />
    </>
  )
}
