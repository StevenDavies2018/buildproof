import { AnalyticsViewTracker } from '@/components/analytics-view-tracker'
import { AnalyticsLink } from '@/components/analytics-link'
import Link from 'next/link'
import ViewStatePersistence from '@/components/view-state-persistence'
import { formatNormalizedStatusLabel, RAW_STATE_OPTIONS } from '@/lib/state-labels'
import { getUserEntitlements, requireActivePlan } from '@/lib/auth'
import {
  type CategoryAnalysisMetric,
  type CategoryYearRow,
  getCategoryAnalysisMetrics,
  getMetricYearRows,
} from '@/lib/category-analysis'
import { HierarchicalCategoryFilters } from '@/components/hierarchical-category-filters'
import { getDashboardOverview } from '@/lib/dashboard'
import {
  type ResearchFilterSearchParams,
  toDashboardFilters,
} from '@/lib/research-filters'
import { SaveResearchViewButton, SavedResearchPanel } from '@/components/saved-research'

export const dynamic = 'force-dynamic'

type TrendFilter = 'all' | CategoryAnalysisMetric['trendLabel']
type CategorySort = 'campaigns' | 'success_rate' | 'median_goal' | 'money_coverage'
type SortOrder = 'desc' | 'asc'

const TREND_FILTERS: Array<{ value: TrendFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'rising', label: 'Rising' },
  { value: 'steady', label: 'Steady' },
  { value: 'softening', label: 'Falling' },
  { value: 'insufficient_data', label: 'Not enough data' },
]

const CATEGORY_SORTS: Array<{ value: CategorySort; label: string }> = [
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'success_rate', label: 'Success rate' },
  { value: 'median_goal', label: 'Median goal' },
  { value: 'money_coverage', label: 'Money coverage' },
]

const DURATION_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'short', label: 'Short (1-15d)' },
  { value: 'medium', label: 'Medium (16-30d)' },
  { value: 'long', label: 'Long (31d+)' },
  { value: 'unknown', label: 'Unknown' },
]

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

const MONEY_RANGE_OPTIONS = [
  { value: '', label: 'Any amount' },
  { value: '1000', label: '$1,000 or more' },
  { value: '5000', label: '$5,000 or more' },
  { value: '10000', label: '$10,000 or more' },
  { value: '25000', label: '$25,000 or more' },
  { value: '50000', label: '$50,000 or more' },
  { value: '100000', label: '$100,000 or more' },
]

type CategoryDisplayMetric = Pick<
  CategoryAnalysisMetric,
  'campaignCount' | 'successRate' | 'medianGoalUsd' | 'moneyComparableCount'
>

type ReportsSearchParams = ResearchFilterSearchParams & {
  window?: string
  category?: string
  trend?: string
  sort?: string
  order?: string
  year?: string
  reportCardLimit?: string
  reportCardOffset?: string
}

function createEmptyMetric(
  taxonomyLabel: string,
  metricWindow: CategoryAnalysisMetric['metricWindow'],
): CategoryAnalysisMetric {
  return {
    dimensionKey: taxonomyLabel,
    taxonomyNodeId: null,
    taxonomyLabel,
    taxonomyParentLabel: null,
    metricWindow,
    windowStart: metricWindow === 'last_24_months' ? '2024-08-12T00:00:00.000Z' : null,
    windowEnd: '2026-08-12T23:59:59.000Z',
    campaignCount: 0,
    successCount: 0,
    failureCount: 0,
    successRate: null,
    medianGoalUsd: null,
    medianPledgedUsd: null,
    medianBackers: null,
    medianAveragePledgeUsd: null,
    medianFundingMultiple: null,
    recentCampaignCount: 0,
    moneyComparableCount: 0,
    trendLabel: 'insufficient_data',
    trendDetails: {
      method: 'year-over-year-count-ratio',
      years: [],
    },
    sourceSnapshotVersion: '2026-08-12',
    currencyNormalizationVersion: 'kickstarter-static-usd-v1',
    classificationVersion: 'campaign-classifications-live',
    analysisVersion: 'reporting-dynamic-v1',
    calculatedAt: new Date('2026-08-20T00:00:00.000Z').toISOString(),
  }
}

function numeric(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatInteger(value: number | null) {
  if (value === null) return 'n/a'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatMoney(value: number | null) {
  if (value === null) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null) {
  if (value === null) return 'n/a'
  return `${value.toFixed(1)}%`
}

function formatMultiple(value: number | string | null) {
  const parsed = numeric(value)
  if (parsed === null) return 'n/a'
  return `${parsed.toFixed(2)}x`
}

function trendLabel(value: CategoryAnalysisMetric['trendLabel']) {
  switch (value) {
    case 'rising':
      return 'Rising'
    case 'steady':
      return 'Steady'
    case 'softening':
      return 'Falling'
    default:
      return 'Limited history'
  }
}

function trendClass(value: CategoryAnalysisMetric['trendLabel']) {
  if (value === 'rising') return 'bs-trend-rising'
  if (value === 'softening') return 'bs-trend-softening'
  if (value === 'steady') return 'bs-trend-steady'
  return 'bs-trend-limited'
}


function categorySortValue(metric: CategoryDisplayMetric, sortBy: CategorySort) {
  if (sortBy === 'campaigns') return metric.campaignCount
  if (sortBy === 'success_rate') return metric.successRate
  if (sortBy === 'median_goal') return metric.medianGoalUsd
  return metric.campaignCount
    ? (metric.moneyComparableCount / metric.campaignCount) * 100
    : null
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="bs-metric-card">
      <p className="bs-kicker">{label}</p>
      <p className="bs-title mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  )
}

function CategoryCard({
  metric,
  displayMetric,
  selected,
  href,
}: {
  metric: CategoryAnalysisMetric
  displayMetric: CategoryDisplayMetric
  selected: boolean
  href: string
}) {
  const coverage = displayMetric.campaignCount
    ? (displayMetric.moneyComparableCount / displayMetric.campaignCount) * 100
    : 0

  return (
    <article
      className={`rounded-[1.5rem] border p-5 ${
        selected
          ? 'bs-category-card-selected'
          : 'border-bs-border bg-bs-panelAlt'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="bs-kicker">Primary category</p>
          <h3 className="bs-title mt-2 text-xl font-semibold">{metric.taxonomyLabel}</h3>
        </div>
        <span className={`bs-data-chip ${trendClass(metric.trendLabel)}`}>
          {trendLabel(metric.trendLabel)}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">Campaigns</p>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
            {formatInteger(displayMetric.campaignCount)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Success rate</p>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
            {formatPercent(displayMetric.successRate)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Median goal</p>
          <p className="mt-1 font-mono font-semibold text-slate-900">
            {formatMoney(displayMetric.medianGoalUsd)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Money coverage</p>
          <p className="mt-1 font-mono font-semibold text-slate-900">
            {formatPercent(coverage)}
          </p>
        </div>
      </div>
      <AnalyticsLink
        href={href}
        scroll={false}
        eventName="report_category_card_opened"
        surface="reports"
        metadata={{ taxonomyLabel: metric.taxonomyLabel }}
        className="bs-button-secondary mt-[30px] inline-flex"
      >
        View category report
      </AnalyticsLink>
    </article>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<ReportsSearchParams>
}) {
  const user = await requireActivePlan('/account?error=Your%20free%20trial%20has%20ended.%20Upgrade%20to%20keep%20using%20Reporting%20View.')
  const entitlements = getUserEntitlements(user)
  const resolvedSearchParams = (await searchParams) ?? {}
  const metricWindow: CategoryAnalysisMetric['metricWindow'] =
    resolvedSearchParams.window === 'last_24_months' ? 'last_24_months' : 'all_time'
  const dashboardFilters = toDashboardFilters(resolvedSearchParams)
  const selectedCategory = typeof resolvedSearchParams.taxonomyLabel === 'string'
    ? resolvedSearchParams.taxonomyLabel.trim()
    : typeof resolvedSearchParams.category === 'string'
      ? resolvedSearchParams.category.trim()
      : ''
  const trendFilter: TrendFilter = TREND_FILTERS.some(
    (filter) => filter.value === resolvedSearchParams.trend,
  )
    ? (resolvedSearchParams.trend as TrendFilter)
    : 'all'
  const categorySort: CategorySort = CATEGORY_SORTS.some(
    (sort) => sort.value === resolvedSearchParams.sort,
  )
    ? (resolvedSearchParams.sort as CategorySort)
    : 'campaigns'
  const sortOrder: SortOrder = resolvedSearchParams.order === 'asc' ? 'asc' : 'desc'
  const reportCardLimit = ['12', '24', '48', '100'].includes(resolvedSearchParams.reportCardLimit ?? '')
    ? resolvedSearchParams.reportCardLimit!
    : '12'
  const reportCardOffset =
    Number.isInteger(Number(resolvedSearchParams.reportCardOffset)) &&
    Number(resolvedSearchParams.reportCardOffset) >= 0
      ? String(Math.floor(Number(resolvedSearchParams.reportCardOffset)))
      : '0'

  const baseFilters = {
    ...dashboardFilters,
    taxonomyLabel: '',
    cardLimit: '12',
    cardOffset: '0',
    sortBy: 'recommended',
    sortDir: 'desc',
  }

  const [metrics, filterSeed] = await Promise.all([
    getCategoryAnalysisMetrics(metricWindow, baseFilters),
    getDashboardOverview(baseFilters),
  ])

  if (!metrics.length) {
    return (
      <main className="bs-shell">
        <ViewStatePersistence />
        <AnalyticsViewTracker mode="reports" />
        <div className="bs-container">
          <section className="bs-panel">
            <p className="bs-kicker">Reporting View</p>
            <h1 className="bs-title mt-3 text-4xl font-semibold">Reports are not available yet</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              The reporting slice needs a valid filtered dataset before category summaries can be shown.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const selectedMetric = selectedCategory === ''
    ? null
    : metrics.find((metric) => metric.dimensionKey.toLowerCase() === selectedCategory.toLowerCase())
      ?? createEmptyMetric(selectedCategory, metricWindow)
  const availableYears = getMetricYearRows(metrics[0])
  const requestedYear = Number(resolvedSearchParams.year)
  const selectedYear = Number.isInteger(requestedYear) && availableYears.some(
    (year) => year.launchYear === requestedYear,
  )
    ? requestedYear
    : null
  const selectedYearMetric = selectedMetric && selectedYear !== null
    ? getMetricYearRows(selectedMetric).find((year) => year.launchYear === selectedYear) ?? null
    : null
  const displayedMetric = selectedYearMetric ?? selectedMetric

  // Captures full reporting state, including an empty taxonomyLabel — saving
  // without drilling into one category preserves the ranked multi-category
  // roster (all subcategories under the current filters), not just a single
  // category's detail report.
  const reportSavableFilters: Record<string, string> = Object.fromEntries(
    Object.entries({
      window: metricWindow,
      search: dashboardFilters.search ?? '',
      categoryParent: dashboardFilters.categoryParent ?? '',
      categorySlug: dashboardFilters.categorySlug ?? '',
      taxonomyLabel: selectedCategory,
      rawState: dashboardFilters.rawState ?? '',
      durationBucket: dashboardFilters.durationBucket ?? '',
      launchWindow: dashboardFilters.launchWindow ?? '',
      minimumBackers: dashboardFilters.minimumBackers ?? '',
      minGoal: dashboardFilters.minGoal ?? '',
      minPledged: dashboardFilters.minPledged ?? '',
      includeFailures: dashboardFilters.includeFailures ?? '',
      fullyResearchableOnly: dashboardFilters.fullyResearchableOnly ?? '',
      trend: trendFilter === 'all' ? '' : trendFilter,
      sort: categorySort === 'campaigns' ? '' : categorySort,
      order: sortOrder === 'desc' ? '' : sortOrder,
      year: selectedYear === null ? '' : String(selectedYear),
    }).filter(([, value]) => value !== ''),
  )
  const reportSavedLabel = selectedCategory
    ? `${selectedCategory} report`
    : [
        dashboardFilters.categoryParent || 'All categories',
        DURATION_OPTIONS.find((option) => option.value === dashboardFilters.durationBucket && option.value)?.label,
        metricWindow === 'last_24_months' ? 'Last 24 months' : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' · ') || 'Reporting roster'

  const categoryEntries = metrics
    .filter((metric) => metric.dimensionKey !== 'all')
    .map((metric) => ({
      metric,
      displayMetric: selectedYear === null
        ? metric
        : getMetricYearRows(metric).find((year) => year.launchYear === selectedYear) ?? null,
    }))
    .filter((entry): entry is { metric: CategoryAnalysisMetric; displayMetric: CategoryAnalysisMetric | CategoryYearRow } => (
      entry.displayMetric !== null
    ))

  const filteredCategories = categoryEntries
    .filter(({ metric }) => trendFilter === 'all' || metric.trendLabel === trendFilter)
    .sort((left, right) => {
      const leftValue = categorySortValue(left.displayMetric, categorySort)
      const rightValue = categorySortValue(right.displayMetric, categorySort)
      if (leftValue === null && rightValue === null) {
        return left.metric.taxonomyLabel.localeCompare(right.metric.taxonomyLabel)
      }
      if (leftValue === null) return 1
      if (rightValue === null) return -1
      const difference = leftValue - rightValue
      if (difference === 0) return left.metric.taxonomyLabel.localeCompare(right.metric.taxonomyLabel)
      return sortOrder === 'asc' ? difference : -difference
    })

  const years = selectedMetric ? getMetricYearRows(selectedMetric) : getMetricYearRows(metrics[0])
  const maxYearCount = Math.max(...years.map((year) => year.campaignCount), 1)
  const moneyCoverage = displayedMetric && displayedMetric.campaignCount
    ? (displayedMetric.moneyComparableCount / displayedMetric.campaignCount) * 100
    : 0

  function buildHref(extra: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    params.set('window', metricWindow)
    if (dashboardFilters.search) params.set('search', dashboardFilters.search)
    if (dashboardFilters.categoryParent) params.set('categoryParent', dashboardFilters.categoryParent)
    if (dashboardFilters.categorySlug) params.set('categorySlug', dashboardFilters.categorySlug)
    if (dashboardFilters.launchWindow) params.set('launchWindow', dashboardFilters.launchWindow)
    if (dashboardFilters.minimumBackers) params.set('minimumBackers', dashboardFilters.minimumBackers)
    if (dashboardFilters.includeFailures) params.set('includeFailures', dashboardFilters.includeFailures)
    if (dashboardFilters.fullyResearchableOnly) params.set('fullyResearchableOnly', dashboardFilters.fullyResearchableOnly)
    if (dashboardFilters.rawState) params.set('rawState', dashboardFilters.rawState)
    if (dashboardFilters.durationBucket) params.set('durationBucket', dashboardFilters.durationBucket)
    if (dashboardFilters.minGoal) params.set('minGoal', dashboardFilters.minGoal)
    if (dashboardFilters.minPledged) params.set('minPledged', dashboardFilters.minPledged)
    if (reportCardLimit) params.set('reportCardLimit', reportCardLimit)
    if (reportCardOffset !== '0') params.set('reportCardOffset', reportCardOffset)

    for (const [key, value] of Object.entries(extra)) {
      if (!value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }

    return `/reports?${params.toString()}`
  }

  const supportingCampaigns = selectedMetric
    ? await getDashboardOverview({
        ...baseFilters,
        taxonomyLabel: selectedMetric.taxonomyLabel,
        years: selectedYear === null ? dashboardFilters.years : String(selectedYear),
        cardLimit: reportCardLimit,
        cardOffset: reportCardOffset,
      })
    : null

  return (
    <main className="bs-shell">
      <ViewStatePersistence />
      <AnalyticsViewTracker mode="reports" />
      <div className="mx-auto grid w-full max-w-[96rem] min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="bs-container grid gap-8">
        <section className="bs-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bs-kicker">Report controls</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">Choose the evidence slice</h2>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Reporting sections">
              <Link href="/reports" className="bs-button-primary" aria-current="page">Category reports</Link>
              <Link href="/reports/structure" className="bs-button-secondary">Goal &amp; duration</Link>
            </nav>
          </div>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl text-sm leading-6 text-slate-600">
              Looking for whether lower goals or shorter durations correlate with success? See{' '}
              <Link href="/reports/structure" className="font-medium text-slate-900 underline underline-offset-4">Goal &amp; duration</Link>.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={buildHref({ window: 'all_time', taxonomyLabel: selectedCategory || undefined })}
                className={metricWindow === 'all_time' ? 'bs-button-primary' : 'bs-button-secondary'}
              >
                All time
              </Link>
              <Link
                href={buildHref({ window: 'last_24_months', taxonomyLabel: selectedCategory || undefined })}
                className={metricWindow === 'last_24_months' ? 'bs-button-primary' : 'bs-button-secondary'}
              >
                Last 24 months
              </Link>
              <SaveResearchViewButton
                filters={reportSavableFilters}
                label={reportSavedLabel}
                source="reports"
                entitlementLimits={entitlements.saveLimits}
              />
            </div>
          </div>

          <form method="get" action="/reports" className="mt-6 grid gap-4">
            <input type="hidden" name="window" value={metricWindow} />
            <div className="grid gap-4 xl:grid-cols-2">
              <label className="grid gap-2 xl:col-span-2">
                <span className="bs-kicker">Research idea</span>
                <input
                  type="text"
                  name="search"
                  defaultValue={dashboardFilters.search}
                  placeholder="Optional keyword query"
                  className="bs-field"
                />
              </label>

              <HierarchicalCategoryFilters
                categories={filterSeed.categories}
                taxonomy={filterSeed.taxonomy}
                defaultParent={dashboardFilters.categoryParent || '__all__'}
                defaultSubcategory={dashboardFilters.categorySlug || '__all__'}
                defaultTaxonomy={selectedCategory}
                submitOnCategoryChange
              />

              <label className="grid gap-2">
                <span className="bs-kicker">State</span>
                <select name="rawState" defaultValue={dashboardFilters.rawState} className="bs-field">
                  {RAW_STATE_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Duration</span>
                <select name="durationBucket" defaultValue={dashboardFilters.durationBucket} className="bs-field">
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Launch window</span>
                <select name="launchWindow" defaultValue={dashboardFilters.launchWindow} className="bs-field">
                  {LAUNCH_WINDOW_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Minimum backers</span>
                <select name="minimumBackers" defaultValue={dashboardFilters.minimumBackers} className="bs-field">
                  {MINIMUM_BACKER_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Minimum goal range (USD)</span>
                <select name="minGoal" defaultValue={dashboardFilters.minGoal} className="bs-field">
                  {MONEY_RANGE_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.value ? option.label : 'Any goal'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Minimum pledged range (USD)</span>
                <select name="minPledged" defaultValue={dashboardFilters.minPledged} className="bs-field">
                  {MONEY_RANGE_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.value ? option.label : 'Any pledged amount'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Completed outcomes</span>
                <select name="includeFailures" defaultValue={dashboardFilters.includeFailures} className="bs-field">
                  <option value="true">Include successes and failures</option>
                  <option value="false">Successful campaigns only</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="bs-kicker">Source completeness</span>
                <select name="fullyResearchableOnly" defaultValue={dashboardFilters.fullyResearchableOnly} className="bs-field">
                  <option value="false">Include all source detail levels</option>
                  <option value="true">Fully researchable only</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="bs-button-primary">Load report</button>
              <Link href="/reports" className="bs-button-secondary">Reset filters</Link>
            </div>
          </form>
        </section>

        {!selectedMetric ? (
          <section className="bs-panel-subtle order-2">
            <p className="bs-kicker">Nothing loaded yet</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Pick a taxonomy label, then load the report</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Reporting stays empty until you choose the product taxonomy you want to inspect.
              Start with a main category and subcategory, narrow further with taxonomy when needed,
              then select <span className="font-semibold text-slate-900">Load report</span> to open the category metrics,
              yearly activity, and supporting campaign links for that exact slice.
            </p>
          </section>
        ) : null}

        {selectedMetric && displayedMetric ? (
          <>
            <section id="selected-report" className="order-4 bs-panel">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="bs-kicker">Selected report</p>
                  <h2 className="bs-title mt-2 text-4xl font-semibold">{selectedMetric.taxonomyLabel}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {selectedYear === null
                      ? `${metricWindow === 'all_time' ? 'All available campaign history' : 'Campaigns launched in the trailing 24 months'} through August 12, 2026.`
                      : `Campaigns launched during ${selectedYear}.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`bs-data-chip ${trendClass(selectedMetric.trendLabel)}`}>
                    {trendLabel(selectedMetric.trendLabel)} activity
                  </span>
                  <span className="bs-button-secondary cursor-default">
                    {formatInteger(displayedMetric.campaignCount)} campaigns
                  </span>
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Campaigns"
                  value={formatInteger(displayedMetric.campaignCount)}
                  note={`${formatInteger(displayedMetric.successCount)} successful and ${formatInteger(displayedMetric.failureCount)} unsuccessful completed campaigns.`}
                />
                <MetricCard
                  label="Success rate"
                  value={formatPercent(displayedMetric.successRate)}
                  note="Calculated from completed outcomes only."
                />
                <MetricCard
                  label="Median goal"
                  value={formatMoney(displayedMetric.medianGoalUsd)}
                  note="Normalized USD using audited Kickstarter source rates."
                />
                <MetricCard
                  label="Median pledged"
                  value={formatMoney(displayedMetric.medianPledgedUsd)}
                  note="The midpoint of normalized pledged totals."
                />
                <MetricCard
                  label="Median backers"
                  value={formatInteger(displayedMetric.medianBackers)}
                  note="The midpoint backer count for this category slice."
                />
                <MetricCard
                  label="Median average pledge"
                  value={formatMoney(displayedMetric.medianAveragePledgeUsd)}
                  note="Normalized pledged amount divided by backers."
                />
                <MetricCard
                  label="Median funding multiple"
                  value={formatMultiple(displayedMetric.medianFundingMultiple)}
                  note="Pledged amount relative to each native campaign goal."
                />
                <MetricCard
                  label="Money coverage"
                  value={formatPercent(moneyCoverage)}
                  note={`${formatInteger(displayedMetric.moneyComparableCount)} campaigns have comparable normalized goal and pledged values.`}
                />
              </div>
            </section>

            <section className="order-2 bs-panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="bs-kicker">Yearly activity</p>
                  <h2 className="bs-title mt-2 text-2xl font-semibold">Launch volume and completed success rate</h2>
                </div>
                <Link
                  href={buildHref({
                    taxonomyLabel: selectedMetric.dimensionKey,
                    trend: trendFilter,
                    sort: categorySort,
                    order: sortOrder,
                  })}
                  className={selectedYear === null ? 'bs-button-primary' : 'bs-button-secondary'}
                >
                  {metricWindow === 'all_time' ? 'All recorded years' : 'Entire trailing window'}
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {years.map((year) => (
                  <Link
                    key={year.launchYear}
                    href={`${buildHref({
                      taxonomyLabel: selectedMetric.dimensionKey,
                      trend: trendFilter,
                      sort: categorySort,
                      order: sortOrder,
                      year: String(year.launchYear),
                    })}#category-roster`}
                    className={`bs-panel-subtle block transition hover:-translate-y-0.5 hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${selectedYear === year.launchYear ? 'ring-2 ring-sky-400' : ''}`}
                    aria-pressed={selectedYear === year.launchYear}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="bs-kicker">{year.launchYear}</p>
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {formatInteger(year.campaignCount)} campaigns
                      </p>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#7489a1e6]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-800 to-sky-600"
                        style={{ width: `${(year.campaignCount / maxYearCount) * 100}%` }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500">Success rate</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatPercent(year.successRate)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <details id="category-roster" className="order-3 bs-panel scroll-mt-28">
          <summary className="cursor-pointer list-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bs-kicker">Category roster</p>
                <h2 className="bs-title mt-2 text-2xl font-semibold">Compare category-level signals</h2>
              </div>
              <span className="bs-accordion-hint">Click to expand <span aria-hidden="true" className="bs-accordion-chevron" /></span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Expand to inspect the category cards generated from the current filtered campaign population.
            </p>
          </summary>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {selectedYear === null
              ? 'Open a category report for its complete metric set, then drill into the underlying campaigns when a signal deserves investigation.'
              : `Showing ${filteredCategories.length} category groups containing campaigns launched in ${selectedYear}.`}
          </p>

          <form
            method="get"
            action="/reports#category-roster"
            className="bs-toolbar mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr,1fr,1fr,auto] xl:items-end"
          >
            <input type="hidden" name="window" value={metricWindow} />
            <input type="hidden" name="search" value={dashboardFilters.search ?? ''} />
            <input type="hidden" name="categoryParent" value={dashboardFilters.categoryParent ?? ''} />
            <input type="hidden" name="categorySlug" value={dashboardFilters.categorySlug ?? ''} />
            <input type="hidden" name="launchWindow" value={dashboardFilters.launchWindow ?? ''} />
            <input type="hidden" name="minimumBackers" value={dashboardFilters.minimumBackers ?? ''} />
            <input type="hidden" name="includeFailures" value={dashboardFilters.includeFailures ?? 'true'} />
            <input type="hidden" name="fullyResearchableOnly" value={dashboardFilters.fullyResearchableOnly ?? 'false'} />
            <input type="hidden" name="rawState" value={dashboardFilters.rawState ?? ''} />
            <input type="hidden" name="durationBucket" value={dashboardFilters.durationBucket ?? ''} />
            <input type="hidden" name="minGoal" value={dashboardFilters.minGoal ?? ''} />
            <input type="hidden" name="minPledged" value={dashboardFilters.minPledged ?? ''} />
            <input type="hidden" name="taxonomyLabel" value={selectedCategory ?? ''} />
            {selectedYear !== null ? <input type="hidden" name="year" value={selectedYear} /> : null}

            <label className="grid gap-2">
              <span className="bs-kicker">State</span>
              <select name="trend" defaultValue={trendFilter} className="bs-field">
                {TREND_FILTERS.map((filter) => {
                  const count =
                    filter.value === 'all'
                      ? categoryEntries.length
                      : categoryEntries.filter(({ metric }) => metric.trendLabel === filter.value).length
                  return (
                    <option key={filter.value} value={filter.value}>
                      {filter.label} ({count} {count === 1 ? 'category' : 'categories'})
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="bs-kicker">Sort by</span>
              <select name="sort" defaultValue={categorySort} className="bs-field">
                {CATEGORY_SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>{sort.label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="bs-kicker">Order</span>
              <select name="order" defaultValue={sortOrder} className="bs-field">
                <option value="desc">Highest first</option>
                <option value="asc">Lowest first</option>
              </select>
            </label>

            <button type="submit" className="bs-button-primary">Apply</button>
          </form>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCategories.map(({ metric, displayMetric }) => (
              <CategoryCard
                key={metric.dimensionKey}
                metric={metric}
                displayMetric={displayMetric}
                selected={metric.dimensionKey === selectedCategory}
                href={`${buildHref({
                  taxonomyLabel: metric.dimensionKey,
                  trend: trendFilter,
                  sort: categorySort,
                  order: sortOrder,
                  year: selectedYear === null ? undefined : String(selectedYear),
                })}#selected-report`}
              />
            ))}
          </div>

          {filteredCategories.length === 0 ? (
            <div className="bs-panel-subtle mt-6 text-sm text-slate-600">
              No categories match this trend status in the selected reporting window.
            </div>
          ) : null}
        </details>

        {selectedMetric && supportingCampaigns ? (
          <section className="order-5 bs-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="bs-kicker">Supporting campaigns</p>
                <h2 className="bs-title mt-2 text-2xl font-semibold">Campaign links for this report</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  These campaigns match the selected report slice. Open a detail page
                  or the original Kickstarter source without leaving Reporting.
                </p>
              </div>
              <span className="bs-data-chip bg-slate-900 text-white">
                {formatInteger(supportingCampaigns.summary.comparableCampaigns)} campaigns
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {supportingCampaigns.campaigns.length ? (
                <div className="md:col-span-2 xl:col-span-3 flex flex-col gap-3 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className="bs-data-chip bg-sky-100 text-sky-800">
                      Showing {formatInteger(Number(reportCardOffset) + 1)}-{formatInteger(Number(reportCardOffset) + supportingCampaigns.campaigns.length)} of {formatInteger(supportingCampaigns.summary.comparableCampaigns)}
                    </span>
                  </div>
                  <form method="get" action="/reports#selected-report" className="grid gap-3 md:grid-cols-[auto,auto] md:items-end">
                    <input type="hidden" name="window" value={metricWindow} />
                    <input type="hidden" name="search" value={dashboardFilters.search ?? ''} />
                    <input type="hidden" name="categoryParent" value={dashboardFilters.categoryParent ?? ''} />
                    <input type="hidden" name="categorySlug" value={dashboardFilters.categorySlug ?? ''} />
                    <input type="hidden" name="taxonomyLabel" value={selectedCategory ?? ''} />
                    <input type="hidden" name="launchWindow" value={dashboardFilters.launchWindow ?? ''} />
                    <input type="hidden" name="minimumBackers" value={dashboardFilters.minimumBackers ?? ''} />
                    <input type="hidden" name="includeFailures" value={dashboardFilters.includeFailures ?? 'true'} />
                    <input type="hidden" name="fullyResearchableOnly" value={dashboardFilters.fullyResearchableOnly ?? 'false'} />
                    <input type="hidden" name="rawState" value={dashboardFilters.rawState ?? ''} />
                    <input type="hidden" name="durationBucket" value={dashboardFilters.durationBucket ?? ''} />
                    <input type="hidden" name="minGoal" value={dashboardFilters.minGoal ?? ''} />
                    <input type="hidden" name="minPledged" value={dashboardFilters.minPledged ?? ''} />
                    <input type="hidden" name="trend" value={trendFilter} />
                    <input type="hidden" name="sort" value={categorySort} />
                    <input type="hidden" name="order" value={sortOrder} />
                    {selectedYear !== null ? <input type="hidden" name="year" value={selectedYear} /> : null}
                    <input type="hidden" name="reportCardOffset" value="0" />
                    <label className="grid gap-2">
                      <span className="bs-kicker">Cards shown</span>
                      <select name="reportCardLimit" defaultValue={reportCardLimit} className="bs-field">
                        <option value="12">12 cards</option>
                        <option value="24">24 cards</option>
                        <option value="48">48 cards</option>
                        <option value="100">100 cards</option>
                      </select>
                    </label>
                    <button type="submit" className="bs-button-primary">Update cards</button>
                  </form>
                </div>
              ) : null}
              {supportingCampaigns.campaigns.length ? (
                supportingCampaigns.campaigns.map((campaign) => (
                  <article key={campaign.campaignId} className="bs-panel-subtle min-w-0">
                    <p className="bs-kicker">{formatNormalizedStatusLabel(campaign.normalizedStatus)}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {campaign.projectName}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {campaign.primaryClassificationLabel ?? 'Unclassified'} | {campaign.categoryName ?? 'Unknown category'}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {campaign.blurb ?? 'No campaign summary is available in the current snapshot.'}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-bs-border bg-[color:var(--bs-field-bg)] p-2">
                        <span className="block text-slate-500">Goal</span>
                        <span className="mt-1 block font-semibold text-slate-900">
                          {campaign.goalUsd === null ? 'n/a' : formatMoney(Number(campaign.goalUsd))}
                        </span>
                      </div>
                      <div className="rounded-lg border border-bs-border bg-[color:var(--bs-field-bg)] p-2">
                        <span className="block text-slate-500">Pledged</span>
                        <span className="mt-1 block font-semibold text-slate-900">
                          {campaign.pledgedUsd === null ? 'n/a' : formatMoney(Number(campaign.pledgedUsd))}
                        </span>
                      </div>
                      <div className="rounded-lg border border-bs-border bg-[color:var(--bs-field-bg)] p-2">
                        <span className="block text-slate-500">Backers</span>
                        <span className="mt-1 block font-semibold text-slate-900">{formatInteger(campaign.backersCount)}</span>
                      </div>
                      <div className="rounded-lg border border-bs-border bg-[color:var(--bs-field-bg)] p-2">
                        <span className="block text-slate-500">Duration</span>
                        <span className="mt-1 block font-semibold text-slate-900">
                          {campaign.campaignDurationDays === null ? 'n/a' : `${formatInteger(campaign.campaignDurationDays)}d`}
                        </span>
                      </div>
                      <div className="rounded-lg border border-bs-border bg-[color:var(--bs-field-bg)] p-2">
                        <span className="block text-slate-500">Multiple</span>
                        <span className="mt-1 block font-semibold text-slate-900">{formatMultiple(campaign.fundingMultiple)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AnalyticsLink
                        href={`/campaigns/${campaign.campaignId}?returnTo=${encodeURIComponent(buildHref({
                          taxonomyLabel: selectedMetric.dimensionKey,
                          trend: trendFilter,
                          sort: categorySort,
                          order: sortOrder,
                          year: selectedYear === null ? undefined : String(selectedYear),
                        }))}`}
                        eventName="report_supporting_campaign_opened"
                        surface="reports"
                        metadata={{
                          campaignId: campaign.campaignId,
                          taxonomyLabel: selectedMetric.dimensionKey,
                        }}
                        target="_blank"
                        rel="noreferrer"
                        className="bs-button-secondary"
                      >
                        Open detail
                      </AnalyticsLink>
                      {campaign.projectUrl ? (
                        <a href={campaign.projectUrl} target="_blank" rel="noreferrer" className="bs-button-primary">
                          Kickstarter source
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="bs-panel-subtle md:col-span-2 xl:col-span-3 text-sm leading-6 text-slate-600">
                  No supporting campaign links are available for this report slice.
                </div>
              )}
            </div>

            {supportingCampaigns.campaigns.length &&
            Number(reportCardOffset) + supportingCampaigns.campaigns.length < supportingCampaigns.summary.comparableCampaigns ? (
              <form method="get" action="/reports#selected-report" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-4">
                <input type="hidden" name="window" value={metricWindow} />
                <input type="hidden" name="search" value={dashboardFilters.search ?? ''} />
                <input type="hidden" name="categoryParent" value={dashboardFilters.categoryParent ?? ''} />
                <input type="hidden" name="categorySlug" value={dashboardFilters.categorySlug ?? ''} />
                <input type="hidden" name="taxonomyLabel" value={selectedCategory ?? ''} />
                <input type="hidden" name="launchWindow" value={dashboardFilters.launchWindow ?? ''} />
                <input type="hidden" name="minimumBackers" value={dashboardFilters.minimumBackers ?? ''} />
                <input type="hidden" name="includeFailures" value={dashboardFilters.includeFailures ?? 'true'} />
                <input type="hidden" name="fullyResearchableOnly" value={dashboardFilters.fullyResearchableOnly ?? 'false'} />
                <input type="hidden" name="rawState" value={dashboardFilters.rawState ?? ''} />
                <input type="hidden" name="durationBucket" value={dashboardFilters.durationBucket ?? ''} />
                <input type="hidden" name="minGoal" value={dashboardFilters.minGoal ?? ''} />
                <input type="hidden" name="minPledged" value={dashboardFilters.minPledged ?? ''} />
                <input type="hidden" name="trend" value={trendFilter} />
                <input type="hidden" name="sort" value={categorySort} />
                <input type="hidden" name="order" value={sortOrder} />
                <input type="hidden" name="reportCardLimit" value={reportCardLimit} />
                <input type="hidden" name="reportCardOffset" value={String(Number(reportCardOffset) + supportingCampaigns.campaigns.length)} />
                {selectedYear !== null ? <input type="hidden" name="year" value={selectedYear} /> : null}
                <p className="text-sm text-slate-600">
                  More supporting campaigns are available in this report slice.
                </p>
                <button type="submit" className="bs-button-primary">
                  Load next {reportCardLimit}
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
        <SavedResearchPanel />
      </div>
    </main>
  )
}
