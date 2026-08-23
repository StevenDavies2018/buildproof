import type { Metadata } from 'next'
import Link from 'next/link'
import { getDashboardOverview } from '@/lib/dashboard'
import { getUserEntitlements } from '@/lib/auth'
import { PAID_PRICE_USD, TRIAL_DAYS } from '@/lib/faq'

// Was force-dynamic — this page has no per-request personalization, so that
// only bought cold-start TTFB on every hit (and made client-side navigation
// here noticeably slow, since Next falls back to a full page load when a
// prefetch to a dynamic route gets superseded). ISR keeps the dataset stats
// reasonably fresh without paying the dynamic-render cost on every request.
export const revalidate = 300

export const metadata: Metadata = {
  description:
    `Historical Kickstarter research for evidence-based product investigation. ${TRIAL_DAYS}-day free trial, then $${PAID_PRICE_USD}/month.`,
  alternates: { canonical: '/' },
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value: number | null) {
  return value === null ? 'n/a' : `${value.toFixed(1)}%`
}

function formatCoverage(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : 'n/a'
}

export default async function LandingPage() {
  const data = await getDashboardOverview({ cardLimit: '12' })
  const trialEntitlements = getUserEntitlements({
    role: 'user',
    accountType: 'free',
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  })
  const paidEntitlements = getUserEntitlements({ role: 'user', accountType: 'paid', trialEndsAt: null })
  const metrics = [
    ['Campaigns analyzed', formatInteger(data.summary.comparableCampaigns), 'TTRPG campaigns in the current research slice'],
    ['Success rate', formatPercent(data.summary.successRate), 'Completed campaigns that reached their goal'],
    ['Research coverage', formatCoverage(data.summary.researchableCampaignCount, data.summary.comparableCampaigns), 'Campaigns with enough source detail to inspect'],
    ['Money comparability', formatCoverage(data.summary.moneyComparableCount, data.summary.comparableCampaigns), 'Campaigns with trustworthy normalized USD values'],
  ]

  return (
    <main className="bs-shell min-h-0 overflow-hidden pb-2 pt-6 md:pb-3 md:pt-8">
      <div className="bs-container max-w-7xl gap-5">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-sky-400/30 bg-[linear-gradient(135deg,#0f172a_0%,#172554_48%,#0369a1_100%)] px-7 py-4 text-white shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:px-12 md:py-5">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Backer Sonar</p>
              <h1 className="mt-4 max-w-4xl font-mono text-4xl font-semibold leading-tight tracking-tight md:text-6xl">Find the signal before you build.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">A practical research workspace for people deciding what to launch on Kickstarter. Explore real campaign history, compare same-category projects, and separate useful evidence from noise.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/account" className="inline-flex items-center rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Create an account</Link>
                <Link href="/account" className="inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold text-sky-100 transition hover:bg-white/10">Sign in</Link>
              </div>
              <p className="mt-4 text-xs text-slate-300">Backed by the full Kickstarter dataset, with curated research workflows currently focused on TTRPG.</p>
            </div>
            <div className="rounded-[2rem] border border-white/25 bg-slate-950/30 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-200">Pricing</p>
              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Free trial</span>
                    <span className="font-mono text-lg font-semibold text-white">$0 <span className="text-xs font-normal text-slate-300">/ {TRIAL_DAYS}d</span></span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Full research access, up to {trialEntitlements.saveLimits.research} saved views, compare up to {trialEntitlements.compareSelectionLimit}. No AI Co-Pilot.
                  </p>
                  <Link href="/account" className="mt-2 inline-flex items-center rounded-full border border-white/40 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">Start free trial</Link>
                </div>
                <div className="rounded-2xl border border-sky-300/60 bg-white/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Paid</span>
                    <span className="font-mono text-lg font-semibold text-white">${PAID_PRICE_USD} <span className="text-xs font-normal text-slate-300">/ mo</span></span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Unlimited saves, compare up to {paidEntitlements.compareSelectionLimit}, AI Co-Pilot included. Cancel anytime.
                  </p>
                  <Link href="/account" className="mt-2 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-sky-100">Upgrade to Paid</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bs-panel p-5">
          <p className="bs-kicker">TTRPG market snapshot example</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {metrics.map(([label, value, text]) => (
              <div key={label} className="rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-3">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">{label}</span><span className="font-mono text-lg font-semibold text-slate-900">{value}</span></div>
                <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Source-linked Kickstarter data · deterministic calculations · full dataset, all categories</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="bs-panel p-6"><p className="bs-kicker">01 / Search</p><h2 className="bs-title mt-2 text-2xl font-semibold">Start with an idea</h2><p className="mt-2 text-sm leading-6 text-slate-600">Describe the product you are considering and get deterministic, explainable campaign matches.</p></article>
          <article className="bs-panel p-6"><p className="bs-kicker">02 / Compare</p><h2 className="bs-title mt-2 text-2xl font-semibold">Read the market slice</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use category, year, goal, pledged, backer, and duration signals to understand the field.</p></article>
          <article className="bs-panel p-6"><p className="bs-kicker">03 / Decide</p><h2 className="bs-title mt-2 text-2xl font-semibold">Keep the evidence</h2><p className="mt-2 text-sm leading-6 text-slate-600">Save campaigns, research views, and comparisons for the next decision in your process.</p></article>
        </section>

        <section className="bs-panel flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between">
          <div><p className="bs-kicker">Built for clear decisions</p><h2 className="bs-title mt-2 text-3xl font-semibold">No black-box score required.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Backer Sonar starts with source data, explicit filters, reproducible calculations, and visible provenance. AI may come later, but the evidence comes first.</p></div>
        </section>

        <section className="bs-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="bs-kicker">FAQ</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Have a question?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pricing, data sources, AI Co-Pilot, and cancellation &mdash; answered on one page.
            </p>
          </div>
          <Link href="/faq" className="bs-button-secondary shrink-0">Read the FAQ</Link>
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Backer Sonar',
            description: 'Historical Kickstarter research for evidence-based product investigation.',
            url: 'https://www.backersonar.com',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: PAID_PRICE_USD.toFixed(2),
              priceCurrency: 'USD',
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: PAID_PRICE_USD.toFixed(2),
                priceCurrency: 'USD',
                unitText: 'MONTH',
                billingDuration: 'P1M',
              },
              eligibleDuration: {
                '@type': 'QuantitativeValue',
                value: String(TRIAL_DAYS),
                unitCode: 'DAY',
              },
              availability: 'https://schema.org/InStock',
              category: 'Subscription',
            },
          }),
        }}
      />
    </main>
  )
}
