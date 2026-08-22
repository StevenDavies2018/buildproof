import Link from 'next/link'
import { PersistedViewLink } from '@/components/persisted-view-link'
import ThemeToggle from '@/components/theme-toggle'
import { getCurrentUser, getTrialDaysRemaining, getUserEntitlements, isTrialExpired } from '@/lib/auth'
import { getSubscriptionAccessInfo } from '@/lib/billing'
import { hasStripeConfig } from '@/lib/stripe'
import {
  disableAiCopilot,
  enableAiCopilot,
  loginAccount,
  logoutAccount,
  openBillingPortal,
  registerAccount,
  startUpgradeCheckout,
  syncBillingStatus,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pending?: string; checkout?: string }>
}) {
  const user = await getCurrentUser()
  const { error, pending, checkout } = await searchParams
  const trialExpired = user ? isTrialExpired(user) : false
  const trialDaysRemaining = user ? getTrialDaysRemaining(user) : null
  const entitlements = user ? getUserEntitlements(user) : null
  const subscriptionAccess =
    user && user.role !== 'admin' && user.accountType === 'paid'
      ? await getSubscriptionAccessInfo(user.id)
      : null

  function formatDate(value: string | null) {
    if (!value) return 'n/a'
    const date = new Date(value)
    if (Number.isNaN(date.valueOf())) return 'n/a'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  function planSummary() {
    if (!user || !entitlements) return null
    if (user.role === 'admin') {
      return {
        stateLabel: 'Admin',
        tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
        headline: 'Internal admin access is active.',
        detail:
          'This account has unrestricted access to research, reporting, admin controls, and AI Co-pilot features.',
      }
    }

    if (user.accountType === 'paid') {
      const periodEndNote = subscriptionAccess?.currentPeriodEnd
        ? subscriptionAccess.cancelAtPeriodEnd
          ? ` Your subscription is set to cancel and won't renew, but you keep full access through ${formatDate(subscriptionAccess.currentPeriodEnd)}. No refund is issued for the remaining period.`
          : ` Next billing date: ${formatDate(subscriptionAccess.currentPeriodEnd)}.`
        : ''
      return {
        stateLabel: subscriptionAccess?.cancelAtPeriodEnd ? 'Paid (ending)' : 'Paid',
        tone: subscriptionAccess?.cancelAtPeriodEnd
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-emerald-300 bg-emerald-50 text-emerald-900',
        headline: 'Paid plan is active.',
        detail:
          `Full research access is enabled, saved-work limits are removed, compare supports up to 4 campaigns, and AI Co-pilot is included.${periodEndNote}`,
      }
    }

    if (trialExpired) {
      return {
        stateLabel: 'Free read-only',
        tone: 'border-amber-300 bg-amber-50 text-amber-900',
        headline: 'Trial has ended. This account is now in free read-only mode.',
        detail:
          'Saved work remains visible from the account workspace, but research surfaces are paused until the account is upgraded to Paid.',
      }
    }

    return {
      stateLabel: 'Trial',
      tone: 'border-sky-300 bg-sky-50 text-sky-900',
      headline: `Trial is active through ${formatDate(user.trialEndsAt)}.`,
      detail:
        `This account can use the core research workflow now, with limits of ${entitlements.saveLimits.research} saved research views, ${entitlements.saveLimits.campaign} saved campaigns, ${entitlements.saveLimits.comparison} saved comparisons, and compare sets up to ${entitlements.compareSelectionLimit} campaigns.`,
    }
  }

  const plan = planSummary()

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-5xl">
        <section className="bs-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="bs-kicker">Backer Sonar account</p>
              <h1 className="bs-title mt-2 text-4xl font-semibold">Keep your research workspace</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                Save research views, campaigns, and comparisons across sessions.
              </p>
            </div>
            <ThemeToggle className="bs-theme-toggle self-start" />
          </div>

          {error ? <p className="mt-5 min-w-0 break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{decodeURIComponent(error)}</p> : null}
          {pending === 'verification' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-900">Check your email for a verification link before signing in.</p> : null}
          {checkout === 'success' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Payment received. Your plan updates as soon as Stripe confirms the subscription (usually within a few seconds) &mdash; refresh if it still shows Trial.</p> : null}
          {checkout === 'cancelled' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Checkout was cancelled. No changes were made to your plan.</p> : null}
          {checkout === 'synced' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Billing status refreshed from Stripe.</p> : null}
          {checkout === 'copilot-enabled' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">AI Co-Pilot is now enabled.</p> : null}
          {checkout === 'copilot-disabled' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-900">AI Co-Pilot has been turned off. Your saved research is unaffected.</p> : null}

          {user ? (
            <div className="mt-8 min-w-0 rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-6">
              <p className="bs-kicker">Signed in</p>
              <h2 className="mt-3 break-words text-2xl font-semibold text-slate-900">{user.displayName}</h2>
              <p className="mt-2 break-all text-sm leading-6 text-slate-600">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bs-data-chip">{user.role === 'admin' ? 'Admin' : 'User'}</span>
                <span className="bs-data-chip">{plan?.stateLabel ?? (user.accountType === 'paid' ? 'Paid' : 'Trial')}</span>
                {user.role !== 'admin' && user.accountType === 'free' ? (
                  <span className={`bs-data-chip ${trialExpired ? 'bs-trend-softening' : 'bs-trend-rising'}`}>
                    {trialExpired
                      ? `Trial expired ${formatDate(user.trialEndsAt)}`
                      : `${trialDaysRemaining ?? 0} day${trialDaysRemaining === 1 ? '' : 's'} left`}
                  </span>
                ) : null}
                {entitlements?.canUseAiCopilot ? (
                  <span className="bs-data-chip bg-emerald-100 text-emerald-800">AI Co-pilot included</span>
                ) : (
                  <span className="bs-data-chip bg-slate-200 text-slate-700">AI Co-pilot paid only</span>
                )}
              </div>
              {plan ? (
                <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${plan.tone}`}>
                  <p className="font-semibold">{plan.headline}</p>
                  <p className="mt-2">{plan.detail}</p>
                  {user.role !== 'admin' ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-current/20 px-3 py-1">
                        Research views: {entitlements?.saveLimits.research ?? 'Unlimited'}
                      </span>
                      <span className="rounded-full border border-current/20 px-3 py-1">
                        Saved campaigns: {entitlements?.saveLimits.campaign ?? 'Unlimited'}
                      </span>
                      <span className="rounded-full border border-current/20 px-3 py-1">
                        Saved comparisons: {entitlements?.saveLimits.comparison ?? 'Unlimited'}
                      </span>
                      <span className="rounded-full border border-current/20 px-3 py-1">
                        Compare size: up to {entitlements?.compareSelectionLimit ?? 4}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {!trialExpired || user.role === 'admin' || user.accountType === 'paid' ? (
                  <>
                    <PersistedViewLink
                      view="dashboard"
                      fallbackHref="/dashboard"
                      className="bs-button-secondary"
                      analyticsEventName="account_return_to_last_view"
                      analyticsSurface="account"
                      analyticsMetadata={{ destination: 'last-view' }}
                    >
                      Return to last view
                    </PersistedViewLink>
                    <PersistedViewLink view="dashboard" fallbackHref="/dashboard" className="bs-button-primary">
                      Open user view
                    </PersistedViewLink>
                  </>
                ) : (
                  <span className="rounded-full border border-bs-border px-4 py-2 text-sm text-slate-600">
                    Research views are paused for this account.
                  </span>
                )}
                {user.role !== 'admin' && hasStripeConfig() ? (
                  user.accountType === 'paid' ? (
                    <>
                      <form action={openBillingPortal}>
                        <button type="submit" className="bs-button-secondary">Manage billing</button>
                      </form>
                      <form action={syncBillingStatus}>
                        <button
                          type="submit"
                          className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700"
                        >
                          Refresh billing status
                        </button>
                      </form>
                    </>
                  ) : (
                    <form action={startUpgradeCheckout}>
                      <button type="submit" className="bs-button-primary">Upgrade to Paid</button>
                    </form>
                  )
                ) : null}
                <form action={logoutAccount}>
                  <button type="submit" className="bs-button-secondary">Sign out</button>
                </form>
              </div>

              {entitlements?.canUseAiCopilot ? (
                <div className="mt-6 rounded-xl border border-bs-border bg-[color:var(--bs-panel)] p-4">
                  <p className="bs-kicker">AI Co-Pilot</p>
                  {user.aiCopilotEnabled ? (
                    <>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Enabled {formatDate(user.aiCopilotEnabledAt)}. AI Co-Pilot only reads research you have
                        explicitly saved, never invents numbers, and never predicts campaign outcomes &mdash; it
                        explains the same evidence you can already see.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link href="/ai-copilot" className="bs-button-primary">Open AI Co-Pilot</Link>
                        <form action={disableAiCopilot}>
                          <button type="submit" className="bs-button-secondary">Turn off AI Co-Pilot</button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <form action={enableAiCopilot}>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        AI Co-Pilot is an optional interpretation layer over your saved research. It only reads
                        research views, campaigns, and comparisons you have explicitly saved; it never invents
                        data, never predicts whether a campaign will succeed, and never tells you what to build
                        &mdash; it explains the historical evidence already on screen. It is off by default.
                      </p>
                      <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <input name="acknowledge" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
                        <span>I understand AI Co-Pilot only interprets my saved research and does not replace it as evidence.</span>
                      </label>
                      <button type="submit" className="bs-button-primary mt-4">Enable AI Co-Pilot</button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-bs-border bg-[color:var(--bs-panel)] p-4">
                  <p className="bs-kicker">AI Co-Pilot</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    AI Co-Pilot is included in the Paid plan. Upgrade to enable it.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <form action={loginAccount} className="rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
                <p className="bs-kicker">Existing account</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Sign in</h2>
                <label className="mt-5 block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="bs-field mt-2 w-full" /></label>
                <label className="mt-4 block text-sm font-medium text-slate-700">Password<input name="password" type="password" required className="bs-field mt-2 w-full" /></label>
                <button type="submit" className="bs-button-primary mt-5">Sign in</button>
                <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-bs-border" />or<span className="h-px flex-1 bg-bs-border" /></div>
                <a href="/api/auth/google?intent=signin" className="bs-button-secondary inline-flex">Continue with Google</a>
              </form>
              <form action={registerAccount} className="rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
                <p className="bs-kicker">New workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create account</h2>
                <label className="mt-5 block text-sm font-medium text-slate-700">Display name<input name="displayName" required minLength={2} className="bs-field mt-2 w-full" /></label>
                <label className="mt-4 block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="bs-field mt-2 w-full" /></label>
                <label className="mt-4 block text-sm font-medium text-slate-700">Password<input name="password" type="password" required minLength={8} className="bs-field mt-2 w-full" /></label>
                <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <input name="acceptTerms" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
                  <span>
                    I agree to the <Link href="/terms" className="font-medium text-slate-900 underline underline-offset-4">Terms of use</Link> and <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-4">Privacy policy</Link>.
                  </span>
                </label>
                <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <input name="acknowledgeDisclaimer" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
                  <span>
                    I understand the <Link href="/legal-disclaimer" className="font-medium text-slate-900 underline underline-offset-4">legal disclaimer</Link> and that Backer Sonar provides research support, not financial, legal, or performance guarantees.
                  </span>
                </label>
                <button type="submit" className="bs-button-primary mt-5">Create account</button>
                <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-bs-border" />or<span className="h-px flex-1 bg-bs-border" /></div>
                <Link href="/account/google-consent" className="bs-button-secondary inline-flex">Register with Google</Link>
              </form>
            </div>
          )}

          {!user ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PersistedViewLink
                view="dashboard"
                fallbackHref="/dashboard"
                className="bs-button-secondary"
                analyticsEventName="account_return_to_last_view"
                analyticsSurface="account"
                analyticsMetadata={{ destination: 'last-view' }}
              >
                Return to last view
              </PersistedViewLink>
              <p className="text-sm leading-6 text-slate-600">
                Go back to the last dashboard slice you were reviewing without losing your research context.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
