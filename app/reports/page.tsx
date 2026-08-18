import Link from 'next/link'
import {
  type CategoryAnalysisMetric,
  getCategoryAnalysisMetrics,
} from '@/lib/category-analysis'

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

function categorySortValue(metric: CategoryAnalysisMetric, sortBy: CategorySort) {
  if (sortBy === 'campaigns') return metric.campaignCount
  if (sortBy === 'success_rate') return metric.successRate
  if (sortBy === 'median_goal') return metric.medianGoalUsd
  return metric.campaignCount
    ? (metric.moneyComparableCount / metric.campaignCount) * 100
    : null
}

type ReportYear = {
  launchYear: number
  campaignCount: number
  completedCount: number
  successCount: number
  successRate: number | null
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

function formatMultiple(value: number | null) {
  if (value === null) return 'n/a'
  return `${value.toFixed(2)}x`
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

function getYearRows(metric: CategoryAnalysisMetric): ReportYear[] {
  if (!Array.isArray(metric.trendDetails.years)) return []

  return metric.trendDetails.years
    .map((row) => {
      const launchYear = numeric(row.launchYear)
      const campaignCount = numeric(row.campaignCount)
      if (launchYear === null || campaignCount === null) return null
      return {
        launchYear,
        campaignCount,
        completedCount: numeric(row.completedCount) ?? 0,
        successCount: numeric(row.successCount) ?? 0,
        successRate: numeric(row.successRate),
      }
    })
    .filter((row): row is ReportYear => row !== null)
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
  selected,
  metricWindow,
  trendFilter,
  sortBy,
  sortOrder,
}: {
  metric: CategoryAnalysisMetric
  selected: boolean
  metricWindow: CategoryAnalysisMetric['metricWindow']
  trendFilter: TrendFilter
  sortBy: CategorySort
  sortOrder: SortOrder
}) {
  const coverage = metric.campaignCount
    ? (metric.moneyComparableCount / metric.campaignCount) * 100
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
            {formatInteger(metric.campaignCount)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Success rate</p>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
            {formatPercent(metric.successRate)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Median goal</p>
          <p className="mt-1 font-mono font-semibold text-slate-900">
            {formatMoney(metric.medianGoalUsd)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Money coverage</p>
          <p className="mt-1 font-mono font-semibold text-slate-900">
            {formatPercent(coverage)}
          </p>
        </div>
      </div>
      <Link
        href={`/reports?window=${metricWindow}&category=${encodeURIComponent(metric.dimensionKey)}&trend=${trendFilter}&sort=${sortBy}&order=${sortOrder}`}
        className="bs-button-secondary mt-[30px] inline-flex"
      >
        View category report
      </Link>
    </article>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    window?: string
    category?: string
    trend?: string
    sort?: string
    order?: string
  }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const metricWindow: CategoryAnalysisMetric['metricWindow'] =
    resolvedSearchParams.window === 'last_24_months' ? 'last_24_months' : 'all_time'
  const metrics = await getCategoryAnalysisMetrics(metricWindow)
  const requestedCategory = resolvedSearchParams.category ?? 'all'
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
  const selectedMetric =
    metrics.find((metric) => metric.dimensionKey === requestedCategory) ?? metrics[0]

  if (!selectedMetric) {
    return (
      <main className="bs-shell">
        <div className="bs-container">
          <section className="bs-panel">
            <p className="bs-kicker">Reporting View</p>
            <h1 className="bs-title mt-3 text-4xl font-semibold">Reports are not available yet</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Run the category analysis refresh job to materialize the reporting dataset.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const categories = metrics.filter((metric) => metric.dimensionKey !== 'all')
  const filteredCategories = (
    trendFilter === 'all'
      ? categories
      : categories.filter((metric) => metric.trendLabel === trendFilter)
  ).sort((left, right) => {
    const leftValue = categorySortValue(left, categorySort)
    const rightValue = categorySortValue(right, categorySort)
    if (leftValue === null && rightValue === null) {
      return left.taxonomyLabel.localeCompare(right.taxonomyLabel)
    }
    if (leftValue === null) return 1
    if (rightValue === null) return -1
    const difference = leftValue - rightValue
    if (difference === 0) return left.taxonomyLabel.localeCompare(right.taxonomyLabel)
    return sortOrder === 'asc' ? difference : -difference
  })
  const years = getYearRows(selectedMetric)
  const maxYearCount = Math.max(...years.map((year) => year.campaignCount), 1)
  const moneyCoverage = selectedMetric.campaignCount
    ? (selectedMetric.moneyComparableCount / selectedMetric.campaignCount) * 100
    : 0
  const campaignSliceHref =
    selectedMetric.dimensionKey === 'all'
      ? '/?view=campaigns'
      : `/?view=campaigns&taxonomyLabel=${encodeURIComponent(selectedMetric.taxonomyLabel)}`

  return (
    <main className="bs-shell">
      <div className="bs-container grid gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-blue-300/30 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,64,175,0.96)_58%,_rgba(14,165,233,0.88)_100%)] p-8 shadow-[0_24px_60px_rgba(30,64,175,0.18)] md:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-100/80">
                Reporting View
              </p>
              <h1 className="mt-4 font-mono text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Category evidence, already calculated.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/90">
                Read versioned category performance without recomputing the full Kickstarter snapshot. Every report links back to its supporting campaign slice.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 text-sm text-white backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/70">
                Report provenance
              </p>
              <p className="mt-3">Analysis: {selectedMetric.analysisVersion}</p>
              <p>Snapshot: {selectedMetric.sourceSnapshotVersion ?? 'n/a'}</p>
              <p>Calculated: {new Date(selectedMetric.calculatedAt).toLocaleDateString('en-US')}</p>
            </div>
          </div>
        </section>

        <section className="bs-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bs-kicker">Report controls</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">Choose the evidence slice</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/reports?window=all_time&category=${encodeURIComponent(selectedMetric.dimensionKey)}&trend=${trendFilter}&sort=${categorySort}&order=${sortOrder}`}
                className={metricWindow === 'all_time' ? 'bs-button-primary' : 'bs-button-secondary'}
              >
                All time
              </Link>
              <Link
                href={`/reports?window=last_24_months&category=${encodeURIComponent(selectedMetric.dimensionKey)}&trend=${trendFilter}&sort=${categorySort}&order=${sortOrder}`}
                className={metricWindow === 'last_24_months' ? 'bs-button-primary' : 'bs-button-secondary'}
              >
                Last 24 months
              </Link>
            </div>
          </div>

          <form method="get" action="/reports" className="mt-6 grid gap-3 md:grid-cols-[1fr,auto] md:items-end">
            <input type="hidden" name="window" value={metricWindow} />
            <input type="hidden" name="trend" value={trendFilter} />
            <input type="hidden" name="sort" value={categorySort} />
            <input type="hidden" name="order" value={sortOrder} />
            <label className="grid gap-2">
              <span className="bs-kicker">Category</span>
              <select name="category" defaultValue={selectedMetric.dimensionKey} className="bs-field">
                <option value="all">All TTRPG</option>
                {categories.map((metric) => (
                  <option key={metric.dimensionKey} value={metric.dimensionKey}>
                    {metric.taxonomyLabel} ({formatInteger(metric.campaignCount)})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="bs-button-primary">Load report</button>
          </form>
        </section>

        <section className="bs-panel">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="bs-kicker">Selected report</p>
              <h2 className="bs-title mt-2 text-4xl font-semibold">{selectedMetric.taxonomyLabel}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {metricWindow === 'all_time' ? 'All available campaign history' : 'Campaigns launched in the trailing 24 months'} through August 12, 2026.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`bs-data-chip ${trendClass(selectedMetric.trendLabel)}`}>
                {trendLabel(selectedMetric.trendLabel)} activity
              </span>
              <Link href={campaignSliceHref} className="bs-button-primary">
                View supporting campaigns
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Campaigns"
              value={formatInteger(selectedMetric.campaignCount)}
              note={`${formatInteger(selectedMetric.successCount)} successful and ${formatInteger(selectedMetric.failureCount)} unsuccessful completed campaigns.`}
            />
            <MetricCard
              label="Success rate"
              value={formatPercent(selectedMetric.successRate)}
              note="Calculated from completed outcomes only."
            />
            <MetricCard
              label="Median goal"
              value={formatMoney(selectedMetric.medianGoalUsd)}
              note="Normalized USD using audited Kickstarter source rates."
            />
            <MetricCard
              label="Median pledged"
              value={formatMoney(selectedMetric.medianPledgedUsd)}
              note="The midpoint of normalized pledged totals."
            />
            <MetricCard
              label="Median backers"
              value={formatInteger(selectedMetric.medianBackers)}
              note="The midpoint backer count for this category slice."
            />
            <MetricCard
              label="Median average pledge"
              value={formatMoney(selectedMetric.medianAveragePledgeUsd)}
              note="Normalized pledged amount divided by backers."
            />
            <MetricCard
              label="Median funding multiple"
              value={formatMultiple(selectedMetric.medianFundingMultiple)}
              note="Pledged amount relative to each native campaign goal."
            />
            <MetricCard
              label="Money coverage"
              value={formatPercent(moneyCoverage)}
              note={`${formatInteger(selectedMetric.moneyComparableCount)} campaigns have comparable normalized goal and pledged values.`}
            />
          </div>
        </section>

        <section className="bs-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="bs-kicker">Yearly activity</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">Launch volume and completed success rate</h2>
            </div>
            <span className="bs-data-chip bg-slate-900 text-white">
              {metricWindow === 'all_time' ? 'All recorded years' : 'Trailing window'}
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {years.map((year) => (
              <div key={year.launchYear} className="bs-panel-subtle">
                <div className="flex items-center justify-between gap-4">
                  <p className="bs-kicker">{year.launchYear}</p>
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {formatInteger(year.campaignCount)} campaigns
                  </p>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-400"
                    style={{ width: `${(year.campaignCount / maxYearCount) * 100}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">Success rate</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatPercent(year.successRate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="category-roster" className="bs-panel scroll-mt-28">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
            <p className="bs-kicker">Category roster</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Compare category-level signals</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Open a category report for its complete metric set, then drill into the underlying campaigns when a signal deserves investigation.
            </p>
            </div>
          </div>
          <form
            method="get"
            action="/reports#category-roster"
            className="bs-toolbar mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr,1fr,1fr,auto] xl:items-end"
          >
            <input type="hidden" name="window" value={metricWindow} />
            <input type="hidden" name="category" value={selectedMetric.dimensionKey} />
            <label className="grid gap-2">
              <span className="bs-kicker">State</span>
              <select name="trend" defaultValue={trendFilter} className="bs-field">
                {TREND_FILTERS.map((filter) => {
                  const count =
                    filter.value === 'all'
                      ? categories.length
                      : categories.filter((metric) => metric.trendLabel === filter.value).length
                  return (
                    <option key={filter.value} value={filter.value}>
                      {filter.label} ({count})
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
            {filteredCategories.map((metric) => (
              <CategoryCard
                key={metric.dimensionKey}
                metric={metric}
                selected={metric.dimensionKey === selectedMetric.dimensionKey}
                metricWindow={metricWindow}
                trendFilter={trendFilter}
                sortBy={categorySort}
                sortOrder={sortOrder}
              />
            ))}
          </div>
          {filteredCategories.length === 0 ? (
            <div className="bs-panel-subtle mt-6 text-sm text-slate-600">
              No categories match this trend status in the selected reporting window.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
