import Link from 'next/link'
import { HierarchicalCategoryFilters } from '@/components/hierarchical-category-filters'
import { getUserEntitlements, requireActivePlan } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/dashboard'
import {
  DURATION_BUCKET_LABELS,
  DURATION_BUCKET_ORDER,
  GOAL_BUCKET_LABELS,
  GOAL_BUCKET_ORDER,
  getDurationAnalysisMetrics,
  getGoalSizeAnalysisMetrics,
  type OutcomeBucketMetric,
} from '@/lib/outcome-analysis'
import { SaveResearchViewButton, SavedResearchPanel } from '@/components/saved-research'
import {
  type ResearchFilterSearchParams,
  toDashboardFilters,
} from '@/lib/research-filters'

export const dynamic = 'force-dynamic'

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value: number | null) {
  return value === null ? 'n/a' : `${value.toFixed(1)}%`
}

function formatMoney(value: number | null) {
  if (value === null) return 'n/a'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatMultiple(value: number | null) {
  return value === null ? 'n/a' : `${value.toFixed(2)}x`
}

function BucketTable({
  title,
  description,
  order,
  labels,
  rows,
}: {
  title: string
  description: string
  order: string[]
  labels: Record<string, string>
  rows: OutcomeBucketMetric[]
}) {
  const byBucket = new Map(rows.map((row) => [row.bucketKey, row]))
  const orderedRows = order
    .map((bucketKey) => byBucket.get(bucketKey))
    .filter((row): row is OutcomeBucketMetric => Boolean(row && row.campaignCount > 0))

  return (
    <section className="bs-panel">
      <p className="bs-kicker">{title}</p>
      <h2 className="bs-title mt-2 text-2xl font-semibold">{description}</h2>
      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-bs-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[color:var(--bs-field-bg)]">
            <tr>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Bucket</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Campaigns</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Success rate</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Median goal</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Median pledged</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Median backers</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Median funding multiple</th>
            </tr>
          </thead>
          <tbody>
            {orderedRows.map((row, index) => (
              <tr
                key={row.bucketKey}
                className={index % 2 === 0 ? 'bg-transparent' : 'bg-[color:var(--bs-field-bg)]/50'}
              >
                <td className="px-3 py-2 text-sm font-medium text-slate-900 whitespace-nowrap">{labels[row.bucketKey] ?? row.bucketKey}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.campaignCount)}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatPercent(row.successRate)}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatMoney(row.medianGoalUsd)}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatMoney(row.medianPledgedUsd)}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.medianBackers ?? 0)}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatMultiple(row.medianFundingMultiple)}</td>
              </tr>
            ))}
            {!orderedRows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                  Not enough campaigns matched this slice to break out by bucket.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default async function StructureAnalysisPage({
  searchParams,
}: {
  searchParams?: Promise<ResearchFilterSearchParams>
}) {
  const user = await requireActivePlan('/account?error=Your%20free%20trial%20has%20ended.%20Upgrade%20to%20keep%20using%20Reporting%20View.')
  const entitlements = getUserEntitlements(user)
  const resolvedSearchParams = (await searchParams) ?? {}
  const dashboardFilters = toDashboardFilters(resolvedSearchParams)
  const selectedTaxonomyLabel = (dashboardFilters.taxonomyLabel ?? '').trim()
  const focusLabel = selectedTaxonomyLabel || 'All categories'

  const baseFilters = {
    ...dashboardFilters,
    taxonomyLabel: '',
    cardLimit: '12',
    cardOffset: '0',
    sortBy: 'recommended',
    sortDir: 'desc',
  }

  const [goalMetrics, durationMetrics, filterSeed] = await Promise.all([
    getGoalSizeAnalysisMetrics('all_time', baseFilters),
    getDurationAnalysisMetrics('all_time', baseFilters),
    getDashboardOverview(baseFilters),
  ])

  const goalRows = goalMetrics.filter((row) => row.taxonomyLabel === focusLabel)
  const durationRows = durationMetrics.filter((row) => row.taxonomyLabel === focusLabel)

  const savableFilters: Record<string, string> = Object.fromEntries(
    Object.entries({
      categoryParent: dashboardFilters.categoryParent ?? '',
      categorySlug: dashboardFilters.categorySlug ?? '',
      taxonomyLabel: selectedTaxonomyLabel,
      launchWindow: dashboardFilters.launchWindow ?? '',
    }).filter(([, value]) => value !== ''),
  )

  return (
    <main className="bs-shell">
      <div className="mx-auto grid w-full max-w-[96rem] min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="bs-container grid gap-8">
        <section className="bs-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bs-kicker">Reporting View</p>
              <h1 className="bs-title mt-2 text-3xl font-semibold md:text-4xl">What structurally correlates with outcomes</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                Two deterministic breakdowns of the same underlying campaign set: by initial funding goal, and by
                campaign duration. These are grouped counts and medians &mdash; not a model&apos;s opinion &mdash; so
                you can see directly whether lower goals or shorter durations line up with higher success rates or
                funding multiples in this data.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Reporting sections">
              <Link href="/reports" className="bs-button-secondary">Category reports</Link>
              <Link href="/reports/structure" className="bs-button-primary" aria-current="page">Goal &amp; duration</Link>
            </nav>
          </div>

          <form method="get" action="/reports/structure" className="mt-6 grid gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <HierarchicalCategoryFilters
                categories={filterSeed.categories}
                taxonomy={filterSeed.taxonomy}
                defaultParent={dashboardFilters.categoryParent || '__all__'}
                defaultSubcategory={dashboardFilters.categorySlug || '__all__'}
                defaultTaxonomy={selectedTaxonomyLabel}
                submitOnCategoryChange
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="bs-button-primary">Apply</button>
              <Link href="/reports/structure" className="bs-button-secondary">Reset filters</Link>
              <SaveResearchViewButton
                filters={savableFilters}
                label={`${focusLabel}: goal & duration structure`}
                source="reports-structure"
                entitlementLimits={entitlements.saveLimits}
              />
            </div>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{focusLabel}</span>. Pick a taxonomy label above
            to focus on one category, or leave it unset for the aggregate across everything. Note: this view always
            shows every goal bucket and every duration bucket regardless of any goal or duration filter elsewhere in
            the app &mdash; narrowing those would just collapse the comparison to one row.
          </p>
        </section>

        <BucketTable
          title="By initial goal"
          description="Success rate and funding multiple, grouped by how much a campaign originally asked for"
          order={GOAL_BUCKET_ORDER}
          labels={GOAL_BUCKET_LABELS}
          rows={goalRows}
        />

        <BucketTable
          title="By campaign duration"
          description="Success rate and funding multiple, grouped by how long the campaign ran"
          order={DURATION_BUCKET_ORDER}
          labels={DURATION_BUCKET_LABELS}
          rows={durationRows}
        />
      </div>
        <SavedResearchPanel />
      </div>
    </main>
  )
}
