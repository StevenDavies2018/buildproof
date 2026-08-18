import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCampaignDetail } from '@/lib/research'

export const dynamic = 'force-dynamic'

function toNumericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatInteger(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)
}

function formatMultiple(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return `${numeric.toFixed(2)}x`
}

function formatUsd(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric)
}

function formatNative(value: number | string | null, currency: string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numeric)} ${currency?.toUpperCase() ?? 'native'}`
}

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

function normalizeModeLabel(mode: string) {
  switch (mode) {
    case 'native_usd':
      return 'Native USD'
    case 'static_usd_rate':
      return 'Kickstarter static USD rate'
    case 'usd_pledged_ratio':
      return 'Derived from Kickstarter USD pledged'
    case 'converted_pledged_ratio':
      return 'Fallback converted-pledged rate'
    default:
      return 'Normalization unavailable'
  }
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const resolvedParams = await params
  const campaignId = Number.parseInt(resolvedParams.campaignId, 10)

  if (!Number.isInteger(campaignId)) {
    notFound()
  }

  const campaign = await getCampaignDetail(campaignId)

  if (!campaign) {
    notFound()
  }

  return (
    <main className="bs-shell">
      <div className="bs-container">
        <section className="bs-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="bs-data-chip bg-slate-900 text-white">
                  {campaign.normalizedStatus}
                </span>
                {campaign.primaryClassificationLabel ? (
                  <span className="bs-data-chip bg-sky-100 text-sky-800">
                    {campaign.primaryClassificationLabel}
                  </span>
                ) : null}
                {campaign.isFullyResearchable ? (
                  <span className="bs-data-chip bg-emerald-100 text-emerald-800">
                    Researchable
                  </span>
                ) : null}
              </div>
              <p className="bs-kicker mt-4">Campaign detail</p>
              <h1 className="bs-title mt-2 text-4xl font-semibold">{campaign.projectName}</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {campaign.categoryName ?? 'Unknown category'} | {campaign.categorySlug ?? 'n/a'} |{' '}
                {formatDate(campaign.launchedAt)}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {campaign.blurb ?? 'No short blurb available.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/" className="bs-button-secondary">
                Back to user view
              </Link>
              {campaign.projectUrl ? (
                <a
                  href={campaign.projectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bs-button-primary"
                >
                  Open Kickstarter
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="bs-metric-card">
            <p className="bs-kicker">Goal</p>
            <p className="bs-title mt-3 text-2xl font-semibold">
              {formatNative(campaign.money.goalRaw, campaign.money.currency)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              USD {formatUsd(campaign.money.goalUsd)}
            </p>
          </div>
          <div className="bs-metric-card">
            <p className="bs-kicker">Pledged</p>
            <p className="bs-title mt-3 text-2xl font-semibold">
              {formatNative(campaign.money.pledgedRaw, campaign.money.currency)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              USD {formatUsd(campaign.money.pledgedUsd)}
            </p>
          </div>
          <div className="bs-metric-card">
            <p className="bs-kicker">Backers</p>
            <p className="bs-title mt-3 text-2xl font-semibold">
              {formatInteger(campaign.backersCount)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Average pledge {formatUsd(campaign.averagePledge)}
            </p>
          </div>
          <div className="bs-metric-card bs-metric-card-accent">
            <p className="bs-kicker">Funding multiple</p>
            <p className="bs-title mt-3 text-2xl font-semibold">
              {formatMultiple(campaign.fundingMultiple)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {campaign.campaignDurationDays ?? 'n/a'} day campaign
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.6fr)]">
          <div className="bs-panel min-w-0">
            <p className="bs-kicker">Overview</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Source and campaign facts</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Creator</p>
                <p className="mt-2 text-sm text-slate-700">{campaign.creatorName ?? 'n/a'}</p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Country</p>
                <p className="mt-2 text-sm text-slate-700">{campaign.country ?? 'n/a'}</p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Launch date</p>
                <p className="mt-2 text-sm text-slate-700">{formatDate(campaign.launchedAt)}</p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Deadline</p>
                <p className="mt-2 text-sm text-slate-700">{formatDate(campaign.deadlineAt)}</p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Membership</p>
                <p className="mt-2 text-sm text-slate-700 [overflow-wrap:anywhere]">{campaign.membershipStatus ?? 'n/a'}</p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Confidence</p>
                <p className="mt-2 text-sm text-slate-700 [overflow-wrap:anywhere]">{campaign.confidenceLabel ?? 'n/a'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-5">
              <p className="bs-kicker">Description</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {campaign.description ?? campaign.blurb ?? 'No extended description available in the current snapshot.'}
              </p>
            </div>
          </div>

          <div className="bs-panel min-w-0">
            <p className="bs-kicker">Compare readiness</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Normalization and taxonomy</h2>
            <div className="mt-6 grid min-w-0 gap-4">
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Money normalization</p>
                <p className="mt-2 text-sm text-slate-700">
                  {normalizeModeLabel(campaign.money.normalizationMode)}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Native values are preserved. USD values use Kickstarter's static USD rate first, then auditable source-field fallbacks when that rate is unavailable.
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Confidence: {campaign.money.rateConfidence ?? 'unavailable'} | Rate: {campaign.money.rate ?? 'n/a'} | Snapshot: {campaign.money.snapshotVersion ?? 'n/a'}
                </p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Taxonomy labels</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {campaign.primaryClassificationLabel ?? 'Unclassified'}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {campaign.taxonomyLabels.length ? campaign.taxonomyLabels.join(', ') : 'No taxonomy labels available.'}
                </p>
              </div>
              <div className="bs-panel-subtle min-w-0">
                <p className="bs-kicker">Campaign source</p>
                {campaign.projectUrl ? (
                  <a
                    href={campaign.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bs-button-primary mt-3 inline-flex"
                  >
                    Open direct Kickstarter campaign
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">No direct campaign URL is available.</p>
                )}
                {campaign.sourceUrls.length ? (
                  <details className="mt-4 border-t border-bs-border pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                      Dataset discovery provenance ({campaign.sourceUrls.length})
                    </summary>
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      These are Kickstarter discovery or listing pages recorded by the source dataset. They document where the crawler found the record and are not direct campaign links.
                    </p>
                    <div className="mt-3 grid min-w-0 gap-2">
                      {campaign.sourceUrls.map((url) => (
                        <p
                          key={url}
                          className="rounded-xl border border-bs-border bg-[color:var(--bs-field-bg)] p-3 font-mono text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]"
                        >
                          {url}
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
              {campaign.categorySlug ? (
                <Link
                  href={`/?categorySlug=${encodeURIComponent(campaign.categorySlug)}&compare=${campaign.campaignId}`}
                  className="bs-button-secondary inline-flex max-w-full"
                >
                  Start compare from this category
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
