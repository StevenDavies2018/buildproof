import Link from 'next/link'
import { HierarchicalCategoryFilters } from '@/components/hierarchical-category-filters'
import { AnalyticsLink } from '@/components/analytics-link'
import { formatNormalizedStatusLabel, RAW_STATE_OPTIONS } from '@/lib/state-labels'
import {
  type DashboardFilters,
  type DashboardOutcomeRow,
  type DashboardTaxonomyRow,
  type DashboardTrendRow,
  getDashboardOverview,
} from '@/lib/dashboard'
import type { UserEntitlements } from '@/lib/auth'
import { SaveCampaignButton, SaveResearchViewButton } from '@/components/saved-research'

const LAUNCH_WINDOW_OPTIONS = [
  { value: '', label: 'All available years' },
  { value: '1m', label: 'Last 1 month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '24m', label: 'Last 24 months' },
]

const MINIMUM_BACKER_OPTIONS = [
  { value: '', label: 'Any backer count' },
  { value: '10', label: '10+ backers' },
  { value: '25', label: '25+ backers' },
  { value: '50', label: '50+ backers' },
  { value: '100', label: '100+ backers' },
  { value: '250', label: '250+ backers' },
  { value: '500', label: '500+ backers' },
  { value: '1000', label: '1,000+ backers' },
]

const MEMBERSHIP_OPTIONS = [
  { value: 'include_high', label: 'Included (high confidence)' },
  { value: 'include_medium', label: 'Included (medium confidence)' },
  { value: 'review', label: 'Needs review' },
  { value: 'exclude', label: 'Excluded' },
]

const CONFIDENCE_OPTIONS = [
  { value: 'include_high', label: 'High confidence' },
  { value: 'include_medium', label: 'Medium confidence' },
  { value: 'review', label: 'Low confidence / unclear' },
]

function toNumericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatInteger(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numeric)
}

function formatPercent(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return `${numeric.toFixed(1)}%`
}

function formatMultiple(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return `${numeric.toFixed(2)}x`
}

function formatUsdMoney(value: number | string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric)
}

function formatNativeMoney(value: number | string | null, currency: string | null) {
  const numeric = toNumericValue(value)
  if (numeric === null) return 'n/a'
  const currencyLabel = currency?.trim() ? currency.toUpperCase() : 'native'
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numeric)} ${currencyLabel}`
}

function formatLaunchDate(value: string | null) {
  if (!value) return 'Unknown launch date'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return 'Unknown launch date'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getSignalLabel(successRate: number | null) {
  if (successRate === null) return 'Unclear'
  if (successRate >= 55) return 'Strong'
  if (successRate >= 35) return 'Mixed'
  return 'Weak'
}

function getCoverageLabel(coverageRate: number) {
  if (coverageRate >= 70) return 'High'
  if (coverageRate >= 40) return 'Medium'
  return 'Low'
}

function outcomeLabel(value: DashboardOutcomeRow['outcome']) {
  return value === 'successful' ? 'Successful' : 'Unsuccessful'
}

function signalChipClass(label: string) {
  switch (label) {
    case 'Strong':
    case 'Rising':
    case 'High':
      return 'bg-emerald-100 text-emerald-800'
    case 'Mixed':
    case 'Steady':
    case 'Medium':
      return 'bg-sky-100 text-sky-800'
    case 'Weak':
    case 'Softening':
    case 'Low':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-stone-200 text-stone-700'
  }
}

function trendLabel(trendDirection: 'rising' | 'steady' | 'softening' | 'insufficient_data') {
  switch (trendDirection) {
    case 'rising':
      return 'Rising'
    case 'steady':
      return 'Steady'
    case 'softening':
      return 'Softening'
    default:
      return 'Unclear'
  }
}

function buildDashboardQueryString(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

function SignalTile({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/75">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-blue-50/80">{note}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div className={accent ? 'bs-metric-card bs-metric-card-accent' : 'bs-metric-card'}>
      <p className="bs-kicker">{label}</p>
      <p className="bs-title mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  )
}

function VisualSignal({
  label,
  value,
  chip,
  note,
}: {
  label: string
  value: string
  chip: string
  note: string
}) {
  return (
    <div className="bs-panel-subtle">
      <div className="flex items-start justify-between gap-3">
        <p className="bs-kicker">{label}</p>
        <span className={`bs-data-chip ${signalChipClass(chip)}`}>{chip}</span>
      </div>
      <p className="bs-title mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  )
}

function ProgressBar({
  value,
  tone = 'blue',
}: {
  value: number
  tone?: 'blue' | 'emerald' | 'amber' | 'slate'
}) {
  const width = `${Math.max(0, Math.min(100, value))}%`
  const toneClass =
    tone === 'emerald'
      ? 'from-emerald-500 to-emerald-300'
      : tone === 'amber'
        ? 'from-amber-500 to-amber-300'
        : tone === 'slate'
          ? 'from-slate-800 to-slate-500'
          : 'from-blue-800 to-sky-600'

  return (
    <div className="h-2.5 rounded-full bg-[#7489a1e6]">
      <div
        className={`h-2.5 rounded-full bg-gradient-to-r ${toneClass}`}
        style={{ width }}
      />
    </div>
  )
}

function TaxonomyBar({
  row,
  maxCount,
  filters,
  activeLabel,
}: {
  row: DashboardTaxonomyRow
  maxCount: number
  filters: DashboardFilters
  activeLabel: string
}) {
  const percentage = maxCount > 0 ? (row.campaignCount / maxCount) * 100 : 0
  const isActive = activeLabel === row.label
  const href = `/dashboard${buildDashboardQueryString({
    ...filters,
    taxonomyLabel: isActive ? '' : row.label,
  })}`

  return (
    <Link
      href={href}
      className={`bs-panel-subtle block transition hover:border-sky-300 hover:bg-bs-panel ${
        isActive ? 'border-sky-400 bg-sky-50/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-slate-900">{row.label}</p>
          {isActive ? (
            <span className="bs-data-chip bg-sky-100 text-sky-800">Filter active</span>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-slate-700">{formatInteger(row.campaignCount)}</p>
      </div>
      <div className="mt-3">
        <ProgressBar value={percentage} tone="blue" />
      </div>
    </Link>
  )
}

function getCampaignCompleteness(campaign: {
  projectUrl: string | null
  blurb: string | null
  launchedAt: string | null
  goalUsd: string | null
  pledgedUsd: string | null
  backersCount: number | null
  campaignDurationDays: number | null
  taxonomyLabels: string[]
}) {
  return [
    Boolean(campaign.projectUrl),
    Boolean(campaign.blurb),
    Boolean(campaign.launchedAt),
    Boolean(campaign.goalUsd && campaign.pledgedUsd),
    campaign.backersCount !== null,
    campaign.campaignDurationDays !== null,
    campaign.taxonomyLabels.length > 0,
  ].filter(Boolean).length
}

function formatCardSort(sortBy: string, sortDir: string) {
  if (sortBy === 'recommended') return 'Recommended order'

  const labels: Record<string, string> = {
    projectName: 'Project name',
    launchDate: 'Launch date',
    goal: 'Goal',
    pledged: 'Pledged',
    backers: 'Backers',
    fundingMultiple: 'Funding multiple',
    duration: 'Duration',
  }
  return `${labels[sortBy] ?? sortBy} ${sortDir === 'asc' ? 'ascending' : 'descending'}`
}

function TrendRowVisual({
  row,
  maxCount,
}: {
  row: DashboardTrendRow
  maxCount: number
}) {
  const countPercent = maxCount > 0 ? (row.campaignCount / maxCount) * 100 : 0
  const successPercent = toNumericValue(row.successRate) ?? 0

  return (
    <div className="bs-panel-subtle">
      <div className="flex items-center justify-between gap-4">
        <p className="bs-kicker">{row.launchYear}</p>
        <p className="text-sm font-semibold text-slate-900">
          {formatInteger(row.campaignCount)} campaigns
        </p>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
            <span>Activity</span>
            <span>{formatInteger(row.campaignCount)}</span>
          </div>
          <ProgressBar value={countPercent} tone="slate" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
            <span>Success rate</span>
            <span>{formatPercent(row.successRate)}</span>
          </div>
          <ProgressBar value={successPercent} tone="emerald" />
        </div>
      </div>
    </div>
  )
}

function OutcomeVisual({
  row,
  maxCampaigns,
}: {
  row: DashboardOutcomeRow
  maxCampaigns: number
}) {
  const campaignPercent =
    maxCampaigns > 0 ? ((toNumericValue(row.campaignCount) ?? 0) / maxCampaigns) * 100 : 0
  const researchableRate = toNumericValue(row.researchableRate) ?? 0

  return (
    <div className="bs-panel-subtle">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="bs-kicker">{outcomeLabel(row.outcome)}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {formatInteger(row.campaignCount)}
          </p>
        </div>
        <span
          className={`bs-data-chip ${
            row.outcome === 'successful'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {outcomeLabel(row.outcome)}
        </span>
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
            <span>Share of slice</span>
            <span>{formatInteger(row.campaignCount)}</span>
          </div>
          <ProgressBar
            value={campaignPercent}
            tone={row.outcome === 'successful' ? 'emerald' : 'amber'}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Backers</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {formatInteger(row.medianBackers)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Duration</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {formatInteger(row.medianDurationDays)}d
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Multiple</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {formatMultiple(row.medianFundingMultiple)}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
            <span>Research coverage</span>
            <span>{formatPercent(row.researchableRate)}</span>
          </div>
          <ProgressBar value={researchableRate} tone="blue" />
        </div>
      </div>
    </div>
  )
}

export default async function ResearchDashboard({
  filters,
  compareIds,
  startMode = false,
  entitlements,
}: {
  filters: DashboardFilters
  compareIds: number[]
  startMode?: boolean
  entitlements: UserEntitlements
}) {
  const data = await getDashboardOverview(filters)
  const savableFilters = Object.fromEntries(
    Object.entries(data.filters).filter(([, value]) => value !== ''),
  ) as Record<string, string>
  const savedResearchLabel =
    data.filters.search ||
    data.filters.taxonomyLabel ||
    data.filters.categorySlug ||
    'TTRPG market slice'

  const retryHref = `/dashboard${buildDashboardQueryString(data.filters)}`

  if (!data.configured) {
    return (
      <section className="bs-panel">
        <p className="bs-kicker">Backer Sonar</p>
        <h1 className="bs-title mt-3 text-4xl font-semibold">
          Research dashboard unavailable
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          `POSTGRES_URL` is not configured yet, so the user-facing research view
          cannot query the TTRPG proof-of-concept dataset.
        </p>
      </section>
    )
  }

  if (data.error === 'database') {
    return (
      <section className="bs-panel">
        <p className="bs-kicker">Backer Sonar</p>
        <h1 className="bs-title mt-3 text-4xl font-semibold">Research dashboard temporarily unavailable</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          The data connection did not respond. Your current filters are preserved,
          and no research results were substituted or inferred.
        </p>
        <Link href={retryHref} className="bs-button-primary mt-6 inline-flex">
          Retry connection
        </Link>
      </section>
    )
  }

  const coverageRate =
    data.summary.comparableCampaigns > 0
      ? (data.summary.researchableCampaignCount / data.summary.comparableCampaigns) * 100
      : 0
  const moneyCoverageRate =
    data.summary.comparableCampaigns > 0
      ? (data.summary.moneyComparableCount / data.summary.comparableCampaigns) * 100
      : 0
  const signal = getSignalLabel(data.summary.successRate)
  const trend = trendLabel(data.trendDirection)
  const coverage = getCoverageLabel(coverageRate)
  const maxTaxonomyCount = Math.max(...data.taxonomy.map((row) => row.campaignCount), 0)
  const maxTrendCount = Math.max(...data.trends.map((row) => row.campaignCount), 0)
  const maxOutcomeCount = Math.max(
    ...data.outcomes.map((row) => toNumericValue(row.campaignCount) ?? 0),
    0,
  )
  const activeTaxonomyLabel = data.filters.taxonomyLabel
  const selectedYears = new Set(
    data.filters.years
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value)),
  )
  const selectedCompareIds = new Set(compareIds)
  const selectedCompareCampaigns = compareIds
    .map((id) => data.campaigns.find((campaign) => campaign.campaignId === id))
    .filter((campaign): campaign is (typeof data.campaigns)[number] => Boolean(campaign))
  const compareCategorySlug =
    selectedCompareCampaigns.find((campaign) => campaign.categorySlug)?.categorySlug ?? null
  const compareCategoryName =
    selectedCompareCampaigns.find((campaign) => campaign.categorySlug)?.categoryName ?? null
  const selectedCompareCategorySet = new Set(
    selectedCompareCampaigns.map((campaign) => campaign.categorySlug).filter(Boolean),
  )
  const compareSelectionMixed = selectedCompareCategorySet.size > 1
  const activeView = data.filters.view === 'analysis' ? 'analysis' : 'campaigns'
  const compareQueryValue = compareIds.length ? compareIds.join(',') : undefined
  const compareSelectionLimit = entitlements.compareSelectionLimit
  const hasUserSelection = Boolean(
    filters.search || filters.categoryParent || filters.categorySlug || filters.taxonomyLabel || filters.durationBucket ||
    filters.rawState || filters.minGoal || filters.minPledged || filters.years || filters.launchWindow ||
    filters.minimumBackers || filters.includeFailures === 'false' || filters.fullyResearchableOnly === 'true' ||
    filters.view === 'analysis' || compareIds.length,
  )
  const showResults = !startMode || hasUserSelection

  return (
    <section className="grid gap-8">
      <section className="overflow-hidden rounded-[2rem] border border-blue-200 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,64,175,0.96)_54%,_rgba(56,189,248,0.9)_100%)] p-8 shadow-[0_24px_60px_rgba(30,64,175,0.18)] md:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr,0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-100/80">
              Backer Sonar
            </p>
            <h1 className="mt-4 max-w-4xl font-mono text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Kickstarter market signal in one fast scan.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white md:text-lg">
              Start with the TTRPG proof of concept, narrow the market slice, and
              judge demand from activity, success patterns, and directly reviewable campaigns.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <SignalTile
                label="Comparable campaigns"
                value={formatInteger(data.summary.comparableCampaigns)}
                note="Projects inside the current slice."
              />
              <SignalTile
                label="Success rate"
                value={formatPercent(data.summary.successRate)}
                note="Completed outcomes only."
              />
              <SignalTile
                label="Research coverage"
                value={formatPercent(coverageRate)}
                note="Campaigns ready for human review."
              />
            </div>
          </div>

          <div>
            <section id="onboarding-target-filters" className="rounded-[1.75rem] border border-white/12 bg-white/10 p-6 backdrop-blur">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/70">
                      Research filters
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Shape the market slice</h2>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/12 bg-slate-950/30 px-4 py-3 text-sm text-blue-50/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/60">
                      Current dataset
                    </p>
                    <p className="mt-2">August 12, 2026 snapshot</p>
                    <p>Full Kickstarter dataset</p>
                  </div>
                </div>

                <form id="research-filters" method="get" action="/dashboard" className="space-y-5">
                  <input type="hidden" name="view" value={data.filters.view} />
                  <input type="hidden" name="cardLimit" value={data.filters.cardLimit} />
                  <input type="hidden" name="sortBy" value={data.filters.sortBy} />
                  <input type="hidden" name="sortDir" value={data.filters.sortDir} />
                  {data.filters.years ? (
                    <input type="hidden" name="years" value={data.filters.years} />
                  ) : null}
                  {compareIds.length ? (
                    <input type="hidden" name="compare" value={compareIds.join(',')} />
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Research idea (optional)
                      </span>
                      <input
                        type="text"
                        name="search"
                        defaultValue={data.filters.search}
                        placeholder="Enter a research idea"
                        className="bs-field bs-field-dark"
                      />
                      <span className="text-xs leading-5 text-blue-100/65">
                        Leave this blank to browse the selected filters. If you enter an idea,
                        matching terms across project text, categories, and taxonomy rank higher.
                      </span>
                      <span className="text-xs italic leading-5 text-blue-100/50">
                        Example: Solo journaling RPG, 5e monster book, dungeon crawler
                      </span>
                    </label>

                    <HierarchicalCategoryFilters
                      categories={data.categories}
                      taxonomy={data.taxonomy}
                      defaultParent={data.filters.categoryParent}
                      defaultSubcategory={data.filters.categorySlug}
                      defaultTaxonomy={data.filters.taxonomyLabel}
                      submitOnCategoryChange
                      dark
                    />

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        State
                      </span>
                      <select
                        name="rawState"
                        defaultValue={data.filters.rawState}
                        className="bs-field bs-field-dark"
                      >
                        {RAW_STATE_OPTIONS.map((option) => (
                          <option key={option.value || 'all'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Duration
                      </span>
                      <select
                        name="durationBucket"
                        defaultValue={data.filters.durationBucket}
                        className="bs-field bs-field-dark"
                      >
                        <option value="">All</option>
                        <option value="short">Short (1-15d)</option>
                        <option value="medium">Medium (16-30d)</option>
                        <option value="long">Long (31d+)</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Launch window
                      </span>
                      <select
                        name="launchWindow"
                        defaultValue={data.filters.launchWindow ?? ''}
                        className="bs-field bs-field-dark"
                      >
                        {LAUNCH_WINDOW_OPTIONS.map((option) => (
                          <option key={option.value || 'all'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Minimum backers
                      </span>
                      <select
                        name="minimumBackers"
                        defaultValue={data.filters.minimumBackers ?? ''}
                        className="bs-field bs-field-dark"
                      >
                        {MINIMUM_BACKER_OPTIONS.map((option) => (
                          <option key={option.value || 'all'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Minimum goal range (USD)
                      </span>
                      <select name="minGoal" defaultValue={data.filters.minGoal ?? ''} className="bs-field bs-field-dark">
                        <option value="">Any goal</option>
                        <option value="1000">$1,000 or more</option>
                        <option value="5000">$5,000 or more</option>
                        <option value="10000">$10,000 or more</option>
                        <option value="25000">$25,000 or more</option>
                        <option value="50000">$50,000 or more</option>
                        <option value="100000">$100,000 or more</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Minimum pledged range (USD)
                      </span>
                      <select name="minPledged" defaultValue={data.filters.minPledged ?? ''} className="bs-field bs-field-dark">
                        <option value="">Any pledged amount</option>
                        <option value="1000">$1,000 or more</option>
                        <option value="5000">$5,000 or more</option>
                        <option value="10000">$10,000 or more</option>
                        <option value="25000">$25,000 or more</option>
                        <option value="50000">$50,000 or more</option>
                        <option value="100000">$100,000 or more</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Completed outcomes
                      </span>
                      <select
                        name="includeFailures"
                        defaultValue={data.filters.includeFailures ?? 'true'}
                        className="bs-field bs-field-dark"
                      >
                        <option value="true">Include successes and failures</option>
                        <option value="false">Successful campaigns only</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">
                        Source completeness
                      </span>
                      <select
                        name="fullyResearchableOnly"
                        defaultValue={data.filters.fullyResearchableOnly ?? 'false'}
                        className="bs-field bs-field-dark"
                      >
                        <option value="false">Include all source detail levels</option>
                        <option value="true">Fully researchable only</option>
                      </select>
                    </label>

                    <div className="rounded-[1rem] border border-white/12 bg-slate-950/20 px-4 py-3 text-xs leading-6 text-blue-100/70 md:col-span-2">
                      Product taxonomy counts show how many campaigns in the current category slice carry each label before the taxonomy label itself is applied. Final comparable-campaign totals can be lower after all filters are combined.
                    </div>

                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="bs-button-primary">
                      Apply filters
                    </button>
                    <Link href="/dashboard" className="bs-button-secondary border-white/20 bg-white/10 text-white hover:border-white/40 hover:text-white">
                      Reset filters
                    </Link>
                    <SaveResearchViewButton
                      filters={savableFilters}
                      label={savedResearchLabel}
                      className="bs-button-secondary border-white/20 bg-white/10 text-white hover:border-white/40 hover:text-white"
                      entitlementLimits={entitlements.saveLimits}
                    />
                    <Link href="/admin" className="bs-button-secondary border-white/20 bg-white/10 text-white hover:border-white/40 hover:text-white">
                      Open admin view
                    </Link>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </section>

      {showResults ? <>
      <section id="onboarding-target-signal" className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/70">
          Read this slice
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-white/10 px-4 py-3">
            <span className="text-sm text-white">Opportunity signal</span>
            <span className={`bs-data-chip ${signalChipClass(signal)}`}>{signal}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-white/10 px-4 py-3">
            <span className="text-sm text-white">Market activity</span>
            <span className={`bs-data-chip ${signalChipClass(trend)}`}>{trend}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-white/10 px-4 py-3">
            <span className="text-sm text-white">Research coverage</span>
            <span className={`bs-data-chip ${signalChipClass(coverage)}`}>{coverage}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-white/10 px-4 py-3">
            <span className="text-sm text-white">Money comparability</span>
            <span className="bs-data-chip bg-emerald-100 text-emerald-800">
              {formatPercent(moneyCoverageRate)}
            </span>
          </div>
        </div>
      </section>


      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Comparable campaigns"
          value={formatInteger(data.summary.comparableCampaigns)}
          note="The size of the current research slice."
          accent
        />
        <MetricCard
          label="Success rate"
          value={formatPercent(data.summary.successRate)}
          note={`Built from ${formatInteger(data.summary.supportedOutcomeCount)} completed campaigns.`}
        />
        <MetricCard
          label="Median successful backers"
          value={formatInteger(data.summary.medianSuccessfulBackers)}
          note="A cleaner demand read than raw money totals."
        />
        <MetricCard
          label="Recent campaigns"
          value={formatInteger(data.summary.recentCampaignCount)}
          note="Campaigns launched on or after August 17, 2024."
        />
        <MetricCard
          label="Median funding multiple"
          value={formatMultiple(data.summary.medianSuccessfulFundingMultiple)}
          note="Measures pledged value against each campaign's native goal."
        />
        <MetricCard
          label="Fully researchable"
          value={formatInteger(data.summary.researchableCampaignCount)}
          note="Campaigns with enough source detail for direct study."
        />
      </section>

      <nav
        aria-label="Dashboard views"
        className="flex flex-col gap-3 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-3 sm:flex-row"
      >
        <Link
          href={`/dashboard${buildDashboardQueryString({
            ...data.filters,
            view: 'campaigns',
            compare: compareQueryValue,
          })}`}
          aria-current={activeView === 'campaigns' ? 'page' : undefined}
          className={activeView === 'campaigns' ? 'bs-button-primary flex-1' : 'bs-button-secondary flex-1'}
        >
          Campaign research
        </Link>
        <Link
          href={`/dashboard${buildDashboardQueryString({
            ...data.filters,
            view: 'analysis',
            compare: compareQueryValue,
          })}`}
          aria-current={activeView === 'analysis' ? 'page' : undefined}
          className={activeView === 'analysis' ? 'bs-button-primary flex-1' : 'bs-button-secondary flex-1'}
        >
          Market analysis
        </Link>
      </nav>

      <section className="grid items-start gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        {activeView === 'analysis' ? (
        <div className="bs-panel xl:col-span-2">
          <p className="bs-kicker">Fast read</p>
          <h2 className="bs-title mt-2 text-2xl font-semibold">Answer first, evidence second</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <VisualSignal
              label="Opportunity signal"
              value={signal}
              chip={signal}
              note="Based on completed-campaign success patterns in the slice."
            />
            <VisualSignal
              label="Market activity"
              value={trend}
              chip={trend}
              note="Reads recent launch activity against the prior period."
            />
            <VisualSignal
              label="Research coverage"
              value={coverage}
              chip={coverage}
              note="How much of this slice is ready for immediate human review."
            />
          </div>

          <details className="mt-5 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-5">
            <summary className="cursor-pointer text-sm font-medium text-slate-900">
              Why this view is saying that
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="bs-kicker">What looks good</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Stronger slices tend to show enough comparable campaigns, a healthy completed-outcome success rate, and enough researchable entries to verify what the metrics are saying.
                </p>
              </div>
              <div>
                <p className="bs-kicker">What needs caution</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  USD values use Kickstarter&apos;s source exchange metadata and retain the original native amounts. Lower-confidence fallback conversions are identified on campaign details rather than presented as exact historical market rates.
                </p>
              </div>
            </div>
          </details>
        </div>
        ) : null}

        {activeView === 'campaigns' ? (
        <div className="bs-panel xl:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="bs-kicker">Taxonomy fit</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">What kind of product this looks like</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span
                className={`bs-data-chip ${
                  activeTaxonomyLabel ? 'bg-sky-100 text-sky-800' : 'bg-slate-900 text-white'
                }`}
              >
                {activeTaxonomyLabel ? `Filtered: ${activeTaxonomyLabel}` : 'Primary labels'}
              </span>
              {activeTaxonomyLabel ? (
                <Link
                  href={`/dashboard${buildDashboardQueryString({
                    ...data.filters,
                    taxonomyLabel: '',
                  })}`}
                  className="bs-button-secondary px-3 py-1.5"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Click a taxonomy bar to use that product label as a secondary filter across this dashboard.
          </p>
          <div className="mt-6 grid gap-3">
            {data.taxonomy.length ? (
              data.taxonomy.map((row) => (
                <TaxonomyBar
                  key={row.label}
                  row={row}
                  maxCount={maxTaxonomyCount}
                  filters={data.filters}
                  activeLabel={activeTaxonomyLabel}
                />
              ))
            ) : (
              <div className="bs-panel-subtle">
                <p className="text-sm leading-7 text-slate-600">
                  No primary taxonomy labels are available for this filter slice yet.
                </p>
              </div>
            )}
          </div>
        </div>
        ) : null}
      </section>

      {activeView === 'analysis' ? (
      <section className="grid items-start gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="bs-panel">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="bs-kicker">Trend and activity</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">Year-by-year activity view</h2>
            </div>
            <span className={`bs-data-chip ${signalChipClass(trend)}`}>{trend}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/dashboard${buildDashboardQueryString({
                ...data.filters,
                years: '',
              })}`}
              className={`bs-button-secondary px-3 py-1.5 ${
                selectedYears.size === 0 ? 'bg-slate-900 text-white' : ''
              }`}
            >
              All years
            </Link>
            {data.availableYears.map((year) => {
              const isSelected = selectedYears.has(year)
              const nextYears = isSelected
                ? Array.from(selectedYears).filter((value) => value !== year)
                : [...Array.from(selectedYears), year].sort((a, b) => a - b)

              return (
                <Link
                  key={year}
                  href={`/dashboard${buildDashboardQueryString({
                    ...data.filters,
                    years: nextYears.join(','),
                  })}`}
                  className={`bs-button-secondary px-3 py-1.5 ${
                    isSelected ? 'bg-slate-900 text-white' : ''
                  }`}
                >
                  {year}
                </Link>
              )
            })}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.trends.length ? (
              data.trends.slice(-8).map((row) => (
                <TrendRowVisual
                  key={row.launchYear}
                  row={row}
                  maxCount={maxTrendCount}
                />
              ))
            ) : (
              <div className="bs-panel-subtle md:col-span-2">
                <p className="text-sm leading-7 text-slate-600">
                  There is not enough launched campaign history inside the current slice to show a meaningful activity trend.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bs-panel">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="bs-kicker">Success vs failure</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">Compare winners and losers visually</h2>
            </div>
            <span className="bs-data-chip bg-slate-900 text-white">Same slice</span>
          </div>
          <div className="mt-6 grid gap-4">
            {data.outcomes.length ? (
              data.outcomes.map((row) => (
                <OutcomeVisual
                  key={row.outcome}
                  row={row}
                  maxCampaigns={maxOutcomeCount}
                />
              ))
            ) : (
              <div className="bs-panel-subtle">
                <p className="text-sm leading-7 text-slate-600">
                  Outcome comparison is unavailable because the current filters do not include enough completed campaigns.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {activeView === 'campaigns' ? (
      <section id="onboarding-target-campaigns" className="bs-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="bs-kicker">Comparable campaigns</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Campaigns to inspect next</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {data.filters.search
                ? `Ranked deterministically against "${data.filters.search}" using campaign text, taxonomy, category fit, researchability, and source-data completeness.`
                : 'These cards are ranked toward quick human review: researchable entries, stronger backer counts, and same-slice relevance are surfaced first.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bs-data-chip bg-sky-100 text-sky-800">
              Showing {data.campaigns.length ? formatInteger(Number(data.filters.cardOffset) + 1) : '0'}-{formatInteger(Number(data.filters.cardOffset) + data.campaigns.length)} of {formatInteger(data.summary.comparableCampaigns)}
            </span>
            <span className="bs-data-chip bg-slate-900 text-white">
              {formatCardSort(data.filters.sortBy, data.filters.sortDir)}
            </span>
          </div>
        </div>

        <form
          method="get"
          action="/dashboard"
          className="mt-5 grid gap-3 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-4 md:grid-cols-[0.7fr,1fr,1fr,auto] md:items-end"
        >
          {Object.entries(data.filters).map(([name, value]) =>
            value && !['cardLimit', 'cardOffset', 'sortBy', 'sortDir'].includes(name) ? (
              <input key={name} type="hidden" name={name} value={value} />
            ) : null,
          )}
          {compareIds.length ? (
            <input type="hidden" name="compare" value={compareIds.join(',')} />
          ) : null}
          <label className="grid gap-2">
            <span className="bs-kicker">Cards shown</span>
            <select name="cardLimit" defaultValue={data.filters.cardLimit} className="bs-field">
              <option value="12">12 cards</option>
              <option value="24">24 cards</option>
              <option value="48">48 cards</option>
              <option value="100">100 cards</option>
            </select>
          </label>
          <input type="hidden" name="cardOffset" value="0" />
          <label className="grid gap-2">
            <span className="bs-kicker">Sort cards by</span>
            <select name="sortBy" defaultValue={data.filters.sortBy} className="bs-field">
              <option value="recommended">Recommended</option>
              <option value="projectName">Project name</option>
              <option value="launchDate">Launch date</option>
              <option value="goal">Goal (USD)</option>
              <option value="pledged">Pledged (USD)</option>
              <option value="backers">Backers</option>
              <option value="fundingMultiple">Funding multiple</option>
              <option value="duration">Duration</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="bs-kicker">Direction</span>
            <select name="sortDir" defaultValue={data.filters.sortDir} className="bs-field">
              <option value="desc">Descending (Z-A / highest / newest)</option>
              <option value="asc">Ascending (A-Z / lowest / oldest)</option>
            </select>
          </label>
          <button type="submit" className="bs-button-primary">
            Update cards
          </button>
        </form>

        {compareIds.length ? (
          <div className="mt-5 flex flex-col gap-3 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="bs-kicker">Compare queue</p>
              <p className="mt-2 text-sm text-slate-600">
                {compareIds.length} selected for side-by-side review. Choose 2 to {compareSelectionLimit} campaigns for the compare view.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCompareCampaigns.map((campaign) => (
                  <span key={campaign.campaignId} className="bs-data-chip bg-slate-900 text-white">
                    {campaign.projectName}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {compareSelectionMixed
                  ? 'This queue currently spans multiple categories. Compare will still open, but same-category review is easier to trust.'
                  : compareCategorySlug
                    ? `Compare is locked to ${compareCategoryName ?? compareCategorySlug} until you clear the queue.`
                    : `Select up to ${compareSelectionLimit} campaigns from one category for the strongest compare read.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {compareIds.length >= 2 ? (
                <Link
                  href={`/compare?ids=${compareIds.join(',')}`}
                  className="bs-button-primary"
                >
                  Open compare view
                </Link>
              ) : null}
              <Link
                href={`/dashboard${buildDashboardQueryString({
                  ...data.filters,
                  compare: '',
                } as DashboardFilters & { compare?: string })}`}
                className="bs-button-secondary"
              >
                Clear selection
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {data.campaigns.length ? (
            data.campaigns.map((campaign, index) => {
              const onboardingCardIndex = data.campaigns.length > 2 ? 2 : 0
              const isSelected = selectedCompareIds.has(campaign.campaignId)
              const categoryMismatch =
                !isSelected &&
                Boolean(compareCategorySlug) &&
                Boolean(campaign.categorySlug) &&
                compareCategorySlug !== campaign.categorySlug
              const compareLimitReached = !isSelected && compareIds.length >= compareSelectionLimit

              return (
                <article
                  key={campaign.campaignId}
                  id={index === onboardingCardIndex ? 'onboarding-target-campaign-card' : undefined}
                  className="rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                >
                <div className="flex flex-wrap gap-2">
                  <span className="bs-data-chip bg-slate-900 text-white">
                    {formatNormalizedStatusLabel(campaign.normalizedStatus)}
                  </span>
                  {campaign.isFullyResearchable ? (
                    <span className="bs-data-chip bg-emerald-100 text-emerald-800">
                      Researchable
                    </span>
                  ) : null}
                  {campaign.categorySlug ? (
                    <span className="bs-data-chip bg-sky-100 text-sky-800">
                      Same-category ready
                    </span>
                  ) : null}
                  <span className={`bs-data-chip ${getCampaignCompleteness(campaign) >= 6 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    Data {getCampaignCompleteness(campaign)}/7
                  </span>
                  {campaign.goalUsd !== null && campaign.pledgedUsd !== null && campaign.moneyRateConfidence === 'high' ? (
                    <span className="bs-data-chip bg-emerald-100 text-emerald-800">
                      USD comparable
                    </span>
                  ) : (
                    <span className="bs-data-chip bg-amber-100 text-amber-800">
                      Native money only
                    </span>
                  )}
                  {data.filters.search ? (
                    <span className="bs-data-chip bg-blue-100 text-blue-900">
                      Relevance {campaign.relevanceScore}
                    </span>
                  ) : null}
                  {selectedCompareIds.has(campaign.campaignId) ? (
                    <span className="bs-data-chip bg-amber-100 text-amber-800">
                      Selected for compare
                    </span>
                  ) : null}
                  {categoryMismatch ? (
                    <span className="bs-data-chip bg-rose-100 text-rose-800">
                      Different category
                    </span>
                  ) : null}
                </div>

                <h3 className="bs-title mt-4 text-2xl font-semibold">
                  <AnalyticsLink
                    href={`/campaigns/${campaign.campaignId}?returnTo=${encodeURIComponent(`/dashboard${buildDashboardQueryString(data.filters)}`)}`}
                    eventName="campaign_detail_opened"
                    surface="dashboard"
                    metadata={{ campaignId: campaign.campaignId }}
                    className="hover:underline"
                  >
                    {campaign.projectName}
                  </AnalyticsLink>
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {campaign.primaryClassificationLabel ?? 'Unclassified'} |{' '}
                  {campaign.categoryName ?? 'Unknown category'} |{' '}
                  {formatLaunchDate(campaign.launchedAt)}
                </p>

                {campaign.blurb ? (
                  <p className="bs-clamp-3 mt-4 text-sm leading-7 text-slate-600">
                    {campaign.blurb}
                  </p>
                ) : null}

                {data.filters.search && campaign.matchReasons.length ? (
                  <div className="mt-5 rounded-[1.2rem] border border-sky-300/40 bg-sky-400/10 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="bs-kicker">Why this matched</p>
                      <span className="text-xs text-slate-500">{data.rankingVersion}</span>
                    </div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                      {campaign.matchReasons.map((reason) => (
                        <li key={reason} className="flex gap-2">
                          <span aria-hidden="true" className="text-sky-500">-</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                    {campaign.matchedTerms.length ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Matched terms: {campaign.matchedTerms.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
                  <div className="min-w-0 rounded-[1.2rem] border border-bs-border bg-white px-4 py-3">
                    <p className="bs-kicker">Goal</p>
                    <p className="mt-2 whitespace-nowrap text-lg font-semibold text-slate-950">
                      {formatNativeMoney(campaign.goal, campaign.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      USD {formatUsdMoney(campaign.goalUsd)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[1.2rem] border border-bs-border bg-white px-4 py-3">
                    <p className="bs-kicker">Pledged</p>
                    <p className="mt-2 whitespace-nowrap text-lg font-semibold text-slate-950">
                      {formatNativeMoney(campaign.pledged, campaign.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      USD {formatUsdMoney(campaign.pledgedUsd)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[1.2rem] border border-bs-border bg-white px-4 py-3">
                    <p className="bs-kicker">Backers</p>
                    <p className="mt-2 whitespace-nowrap text-lg font-semibold text-slate-950">
                      {formatInteger(campaign.backersCount)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[1.2rem] border border-bs-border bg-white px-4 py-3">
                    <p className="bs-kicker">Funding multiple</p>
                    <p className="mt-2 whitespace-nowrap text-lg font-semibold text-slate-950">
                      {formatMultiple(campaign.fundingMultiple)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[1.2rem] border border-bs-border bg-white px-4 py-3">
                    <p className="bs-kicker">Duration</p>
                    <p className="mt-2 whitespace-nowrap text-lg font-semibold text-slate-950">
                      {campaign.campaignDurationDays === null
                        ? 'n/a'
                        : `${formatInteger(campaign.campaignDurationDays)}d`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <AnalyticsLink
                    href={`/campaigns/${campaign.campaignId}?returnTo=${encodeURIComponent(`/dashboard${buildDashboardQueryString(data.filters)}`)}`}
                    eventName="campaign_detail_opened"
                    surface="dashboard"
                    metadata={{ campaignId: campaign.campaignId }}
                    className="bs-button-secondary"
                  >
                    Open detail
                  </AnalyticsLink>
                  <SaveCampaignButton
                    campaignId={campaign.campaignId}
                    projectName={campaign.projectName}
                    categoryLabel={campaign.primaryClassificationLabel ?? campaign.categoryName}
                    projectUrl={campaign.projectUrl}
                    entitlementLimits={entitlements.saveLimits}
                  />
                  {campaign.projectUrl ? (
                    <a
                      href={campaign.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bs-button-primary"
                    >
                      Open Kickstarter source
                    </a>
                  ) : null}
                  {categoryMismatch ? (
                    <span className="bs-button-secondary cursor-not-allowed opacity-55">
                      Same-category only
                    </span>
                  ) : compareLimitReached ? (
                    <span className="bs-button-secondary cursor-not-allowed opacity-55">
                      Compare full
                    </span>
                  ) : (
                    <AnalyticsLink
                      href={`/dashboard${buildDashboardQueryString({
                        ...data.filters,
                        compare: isSelected
                          ? compareIds.filter((id) => id !== campaign.campaignId).join(',')
                          : [...compareIds, campaign.campaignId].slice(0, compareSelectionLimit).join(','),
                      } as DashboardFilters & { compare?: string })}`}
                      scroll={false}
                      eventName="compare_selection_changed"
                      surface="dashboard"
                      metadata={{
                        action: isSelected ? 'remove' : 'add',
                        campaignId: campaign.campaignId,
                      }}
                      className={
                        isSelected
                          ? 'bs-button-secondary border-amber-300 bg-amber-100 text-amber-900 hover:border-amber-400 hover:bg-amber-200'
                          : 'bs-button-secondary'
                      }
                    >
                      {isSelected ? 'Remove from compare' : 'Select for compare'}
                    </AnalyticsLink>
                  )}
                  {campaign.categorySlug ? (
                    <Link
                      href={`/dashboard?categorySlug=${encodeURIComponent(campaign.categorySlug)}`}
                      className="bs-button-secondary"
                    >
                      Explore same category
                    </Link>
                  ) : null}
                </div>
                {categoryMismatch ? (
                  <p className="mt-3 text-xs leading-6 text-rose-700">
                    Clear the current compare queue or choose projects inside {compareCategoryName ?? compareCategorySlug}.
                  </p>
                ) : compareLimitReached ? (
                  <p className="mt-3 text-xs leading-6 text-amber-700">
                    Trial plans can compare up to {compareSelectionLimit} campaigns at once. Upgrade to unlock 4-campaign compare sets.
                  </p>
                ) : null}
              </article>
              )
            })
          ) : (
            <div className="bs-panel-subtle xl:col-span-2">
              <p className="text-sm leading-7 text-slate-600">
                No campaigns matched this filter set. Try removing a search term,
                lowering the minimum goal or backer threshold, widening the
                duration or launch window, or reopening unsuccessful campaigns.
              </p>
            </div>
          )}
        </div>
        {Number(data.filters.cardOffset) + data.campaigns.length < data.summary.comparableCampaigns ? (
          <form method="get" action="/dashboard" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-4">
            {Object.entries(data.filters).map(([name, value]) =>
              value && !['cardOffset', 'sortBy', 'sortDir'].includes(name) ? (
                <input key={name} type="hidden" name={name} value={value} />
              ) : null,
            )}
            {compareIds.length ? <input type="hidden" name="compare" value={compareIds.join(',')} /> : null}
            <input type="hidden" name="cardOffset" value={String(Number(data.filters.cardOffset) + data.campaigns.length)} />
            <p className="text-sm text-slate-600">
              More campaigns are available in this result set.
            </p>
            <button type="submit" className="bs-button-primary">
              Load next {data.filters.cardLimit}
            </button>
          </form>
        ) : null}
      </section>
      ) : null}
      </> : null}
    </section>
  )
}
