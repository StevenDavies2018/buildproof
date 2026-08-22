import { AnalyticsViewTracker } from '@/components/analytics-view-tracker'
import Link from 'next/link'
import { PersistedViewLink } from '@/components/persisted-view-link'
import { type CompareCampaign, getCompareCampaigns } from '@/lib/research'
import { SaveComparisonButton } from '@/components/saved-research'
import { requireActivePlan } from '@/lib/auth'

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

function formatDurationDays(value: number | null) {
  if (value === null || value === undefined) return 'n/a'
  return `${value}d`
}

function pickCampaignByMetric(
  campaigns: CompareCampaign[],
  getValue: (campaign: CompareCampaign) => number | string | null,
  direction: 'max' | 'min' = 'max',
) {
  const ranked = campaigns
    .map((campaign) => ({
      campaign,
      value: toNumericValue(getValue(campaign)),
    }))
    .filter((entry): entry is { campaign: CompareCampaign; value: number } => entry.value !== null)

  if (!ranked.length) return null

  return ranked.reduce((best, current) => {
    if (direction === 'min') {
      return current.value < best.value ? current : best
    }

    return current.value > best.value ? current : best
  })
}

function CompareHighlightCard({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="bs-panel-subtle">
      <p className="bs-kicker">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  )
}

function CompareMetricBand({
  label,
  note,
  campaigns,
  getValue,
  formatValue,
  direction = 'max',
}: {
  label: string
  note: string
  campaigns: CompareCampaign[]
  getValue: (campaign: CompareCampaign) => number | string | null
  formatValue: (value: number | string | null, campaign: CompareCampaign) => string
  direction?: 'max' | 'min'
}) {
  const values = campaigns.map((campaign) => ({
    campaign,
    numeric: toNumericValue(getValue(campaign)),
  }))
  const comparableValues = values
    .map((entry) => entry.numeric)
    .filter((value): value is number => value !== null)
  const maxValue = comparableValues.length ? Math.max(...comparableValues) : 0
  const bestEntry = pickCampaignByMetric(campaigns, getValue, direction)

  return (
    <div className="bs-panel-subtle">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="bs-kicker">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
        </div>
        {bestEntry ? (
          <span className="bs-data-chip bg-sky-100 text-sky-800">
            Lead: {bestEntry.campaign.projectName}
          </span>
        ) : null}
      </div>
      <div className="mt-5 space-y-4">
        {values.map(({ campaign, numeric }) => {
          const width = numeric !== null && maxValue > 0 ? `${(numeric / maxValue) * 100}%` : '0%'
          const isBest = bestEntry?.campaign.campaignId === campaign.campaignId

          return (
            <div key={`${label}-${campaign.campaignId}`} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-900">{campaign.projectName}</p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatValue(getValue(campaign), campaign)}
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-slate-200/80">
                <div
                  className={`h-2.5 rounded-full ${isBest ? 'bg-gradient-to-r from-blue-700 to-sky-400' : 'bg-gradient-to-r from-slate-700 to-slate-400'}`}
                  style={{ width }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<{ ids?: string }>
}) {
  await requireActivePlan('/account?error=Your%20free%20trial%20has%20ended.%20Upgrade%20to%20keep%20using%20Compare%20View.')
  const resolvedSearchParams = (await searchParams) ?? {}
  const ids = (resolvedSearchParams.ids ?? '')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value))
    .slice(0, 4)

  const campaigns = await getCompareCampaigns(ids)
  const categorySet = new Set(campaigns.map((campaign) => campaign.categorySlug).filter(Boolean))
  const mixedCategories = categorySet.size > 1
  const currencySet = new Set(campaigns.map((campaign) => campaign.money.currency).filter(Boolean))
  const mixedCurrencies = currencySet.size > 1
  const topBackers = pickCampaignByMetric(campaigns, (campaign) => campaign.backersCount)
  const topFundingMultiple = pickCampaignByMetric(campaigns, (campaign) => campaign.fundingMultiple)
  const lowestGoal = pickCampaignByMetric(
    campaigns,
    (campaign) => campaign.money.goalUsd,
    'min',
  )
  const longestRun = pickCampaignByMetric(campaigns, (campaign) => campaign.campaignDurationDays)

  return (
    <main className="bs-shell">
      <div className="bs-container">
        <AnalyticsViewTracker mode="compare" />
        <section className="bs-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="bs-kicker">Same-category comparison</p>
              <h1 className="bs-title mt-2 text-4xl font-semibold">Compare 2 to 4 campaigns side by side</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                This view is strongest when the selected campaigns share the same category. Money values are shown as both native amounts and normalized USD when that normalization is available.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {campaigns.length >= 2 ? (
                <SaveComparisonButton
                  campaignIds={campaigns.map((campaign) => campaign.campaignId)}
                  campaignNames={campaigns.map((campaign) => campaign.projectName)}
                  categoryLabel={mixedCategories ? 'Mixed categories' : campaigns[0]?.primaryClassificationLabel ?? campaigns[0]?.categoryName ?? null}
                />
              ) : null}
              <PersistedViewLink view="dashboard" fallbackHref="/dashboard" className="bs-button-secondary">
                Back to user view
              </PersistedViewLink>
            </div>
          </div>

          {campaigns.length < 2 ? (
            <div className="mt-6 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-5">
              <p className="text-sm leading-7 text-slate-600">
                Select at least two campaigns from the user dashboard to open the compare view.
              </p>
            </div>
          ) : null}

          {mixedCategories ? (
            <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-rose-950">
              <p className="text-sm leading-7">
                These campaigns are from different Kickstarter categories. This view
                is descriptive only; use same-category selections for a trustworthy
                compare-and-contrast conclusion.
              </p>
            </div>
          ) : null}
          {mixedCurrencies ? (
            <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <p className="text-sm leading-7">
                These campaigns use different native currencies. USD values are
                comparable only where normalization is available; review each
                campaign&apos;s normalization confidence before drawing conclusions.
              </p>
            </div>
          ) : null}
        </section>

        {campaigns.length >= 2 ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CompareHighlightCard
                label="Category alignment"
                value={mixedCategories ? 'Mixed categories' : 'Same-category set'}
                note={
                  mixedCategories
                    ? 'Useful for rough inspection, but category-matched comparisons are more trustworthy.'
                    : 'This is the strongest comparison mode for reading demand and packaging differences.'
                }
              />
              <CompareHighlightCard
                label="Backer leader"
                value={topBackers?.campaign.projectName ?? 'n/a'}
                note={
                  topBackers
                    ? `${formatInteger(topBackers.value)} backers in this compare set.`
                    : 'Backer counts are unavailable for this selection.'
                }
              />
              <CompareHighlightCard
                label="Funding multiple leader"
                value={topFundingMultiple?.campaign.projectName ?? 'n/a'}
                note={
                  topFundingMultiple
                    ? `${formatMultiple(topFundingMultiple.value)} against goal.`
                    : 'Funding multiple is unavailable for this selection.'
                }
              />
              <CompareHighlightCard
                label="Lowest goal barrier"
                value={lowestGoal?.campaign.projectName ?? 'n/a'}
                note={
                  lowestGoal
                    ? `Estimated goal ${formatUsd(lowestGoal.value)}.`
                    : 'Goal normalization is unavailable for this selection.'
                }
              />
            </section>

            <section className="bs-panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="bs-kicker">Visual spread</p>
                  <h2 className="bs-title mt-2 text-2xl font-semibold">How the set separates by key metrics</h2>
                </div>
                {longestRun ? (
                  <span className="bs-data-chip bg-slate-900 text-white">
                    Longest run: {longestRun.campaign.projectName}
                  </span>
                ) : null}
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <CompareMetricBand
                  label="Pledged USD"
                  note="Best quick proxy for campaign-scale demand in this set."
                  campaigns={campaigns}
                  getValue={(campaign) => campaign.money.pledgedUsd}
                  formatValue={(value) => formatUsd(value)}
                />
                <CompareMetricBand
                  label="Estimated goal USD"
                  note="Lower goal can mean an easier funding hurdle, though not always a better business case."
                  campaigns={campaigns}
                  getValue={(campaign) => campaign.money.goalUsd}
                  formatValue={(value) => formatUsd(value)}
                  direction="min"
                />
                <CompareMetricBand
                  label="Backers"
                  note="Cleaner than raw money when currencies vary across projects."
                  campaigns={campaigns}
                  getValue={(campaign) => campaign.backersCount}
                  formatValue={(value) => formatInteger(value)}
                />
                <CompareMetricBand
                  label="Funding multiple"
                  note="Shows how far a campaign moved beyond its funding target."
                  campaigns={campaigns}
                  getValue={(campaign) => campaign.fundingMultiple}
                  formatValue={(value) => formatMultiple(value)}
                />
                <CompareMetricBand
                  label="Duration"
                  note="Useful for spotting short-pulse versus long-run campaign strategies."
                  campaigns={campaigns}
                  getValue={(campaign) => campaign.campaignDurationDays}
                  formatValue={(value) => formatDurationDays(toNumericValue(value))}
                />
                <CompareMetricBand
                  label="Average pledge"
                  note="Helpful for seeing whether support depth is coming from many backers or bigger baskets."
                  campaigns={campaigns}
                  getValue={(campaign) => campaign.averagePledge}
                  formatValue={(value) => formatUsd(value)}
                />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
            {campaigns.map((campaign) => (
              <article key={campaign.campaignId} className="bs-panel">
                <div className="flex flex-wrap gap-2">
                  <span className="bs-data-chip bg-slate-900 text-white">
                    {campaign.normalizedStatus}
                  </span>
                  {campaign.primaryClassificationLabel ? (
                    <span className="bs-data-chip bg-sky-100 text-sky-800">
                      {campaign.primaryClassificationLabel}
                    </span>
                  ) : null}
                </div>
                <h2 className="bs-title mt-4 text-3xl font-semibold">
                  <Link href={`/campaigns/${campaign.campaignId}`} className="hover:underline">
                    {campaign.projectName}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {campaign.categoryName ?? 'Unknown category'} | {campaign.categorySlug ?? 'n/a'} | {formatDate(campaign.launchedAt)}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {campaign.blurb ?? 'No short blurb available.'}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Goal</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatNative(campaign.money.goalRaw, campaign.money.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      USD {formatUsd(campaign.money.goalUsd)}
                    </p>
                  </div>
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Pledged</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatNative(campaign.money.pledgedRaw, campaign.money.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      USD {formatUsd(campaign.money.pledgedUsd)}
                    </p>
                  </div>
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Backers</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatInteger(campaign.backersCount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Avg pledge {formatUsd(campaign.averagePledge)}
                    </p>
                  </div>
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Funding multiple</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatMultiple(campaign.fundingMultiple)}
                    </p>
                  </div>
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Duration</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {campaign.campaignDurationDays ?? 'n/a'}d
                    </p>
                  </div>
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Normalization</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {normalizeModeLabel(campaign.money.normalizationMode)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Confidence: {campaign.money.rateConfidence ?? 'unavailable'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Taxonomy</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {campaign.primaryClassificationLabel ?? 'Unclassified'}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {campaign.taxonomyLabels.length ? campaign.taxonomyLabels.join(', ') : 'No taxonomy labels available.'}
                    </p>
                  </div>
                  <div className="bs-panel-subtle">
                    <p className="bs-kicker">Source</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {campaign.creatorName ?? 'n/a'} | {campaign.country ?? 'n/a'}
                    </p>
                    {campaign.projectUrl ? (
                      <a
                        href={campaign.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm underline underline-offset-4"
                      >
                        Open Kickstarter
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
