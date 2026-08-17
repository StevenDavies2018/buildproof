import Link from 'next/link'
import {
  type DashboardFilters,
  type DashboardOutcomeRow,
  getDashboardOverview,
} from '@/lib/dashboard'

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

const STATE_OPTIONS = [
  'successful',
  'failed',
  'canceled',
  'submitted',
  'live',
  'started',
  'suspended',
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

function buildInterpretation({
  comparableCampaigns,
  successRate,
  trendDirection,
  researchableCampaignCount,
}: {
  comparableCampaigns: number
  successRate: number | null
  trendDirection: 'rising' | 'steady' | 'softening' | 'insufficient_data'
  researchableCampaignCount: number
}) {
  if (comparableCampaigns === 0) {
    return {
      summary:
        'This filter slice is too thin to support a real read yet, so the best next move is broadening the search or relaxing the backer threshold.',
      strength: 'No strength signal is available because there are no comparable campaigns in the current slice.',
      risk: 'The current result set is empty, which means any conclusion would be guesswork rather than evidence.',
    }
  }

  const successRead =
    successRate === null
      ? 'mixed'
      : successRate >= 55
        ? 'healthy'
        : successRate >= 35
          ? 'mixed'
          : 'fragile'

  const trendRead =
    trendDirection === 'rising'
      ? 'Recent activity is building rather than fading.'
      : trendDirection === 'softening'
        ? 'Recent activity is softer than the prior period.'
        : trendDirection === 'steady'
          ? 'Recent activity is holding relatively steady.'
          : 'There is not enough year-over-year depth to call a trend cleanly.'

  return {
    summary: `This slice shows ${comparableCampaigns} comparable campaigns with a ${successRate === null ? 'not yet measurable' : `${formatPercent(successRate)} success rate`} across completed outcomes. The current signal reads as ${successRead}. ${trendRead}`,
    strength: `Research coverage is strongest where direct campaign evidence exists. ${formatInteger(researchableCampaignCount)} campaigns in this slice are already fully researchable from the current import.`,
    risk: 'Money comparisons are still limited because goal and pledged values are not yet normalized across currencies, so performance should be judged more from outcome, backers, and funding multiple right now.',
  }
}

function outcomeLabel(value: DashboardOutcomeRow['outcome']) {
  return value === 'successful' ? 'Successful campaigns' : 'Unsuccessful campaigns'
}

export default async function ResearchDashboard({
  filters,
}: {
  filters: DashboardFilters
}) {
  const data = await getDashboardOverview(filters)

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

  const interpretation = buildInterpretation({
    comparableCampaigns: data.summary.comparableCampaigns,
    successRate: data.summary.successRate,
    trendDirection: data.trendDirection,
    researchableCampaignCount: data.summary.researchableCampaignCount,
  })

  return (
    <section className="grid gap-8">
      <section className="bs-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="bs-kicker">Backer Sonar</p>
            <h1 className="bs-title mt-4 text-4xl font-semibold md:text-6xl">
              Historical Kickstarter research for real go or no-go decisions.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              This first user dashboard is focused on the TTRPG proof of concept.
              It is meant to help someone judge demand, activity, and comparable
              campaign patterns before they spend serious time building a project.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="bs-button-secondary">
              Open admin view
            </Link>
          </div>
        </div>

        <form
          method="get"
          action="/"
          className="bs-toolbar mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Research idea
            </span>
            <input
              type="text"
              name="search"
              defaultValue={data.filters.search}
              placeholder="Solo journaling RPG, 5e monster book, dungeon crawler"
              className="bs-field"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Membership
            </span>
            <select
              name="membershipStatus"
              defaultValue={data.filters.membershipStatus}
              className="bs-field"
            >
              <option value="">All</option>
              {MEMBERSHIP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Confidence
            </span>
            <select
              name="confidenceLabel"
              defaultValue={data.filters.confidenceLabel}
              className="bs-field"
            >
              <option value="">All</option>
              {CONFIDENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Category
            </span>
            <select
              name="categorySlug"
              defaultValue={data.filters.categorySlug}
              className="bs-field"
            >
              <option value="">All TTRPG categories</option>
              {data.categories.map((category) => (
                <option key={category.categorySlug} value={category.categorySlug}>
                  {category.categorySlug}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Launch window
            </span>
            <select
              name="launchWindow"
              defaultValue={data.filters.launchWindow}
              className="bs-field"
            >
              <option value="">All available years</option>
              <option value="24m">Last 24 months</option>
              <option value="60m">Last 60 months</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Minimum backers
            </span>
            <input
              type="number"
              name="minimumBackers"
              min="0"
              step="1"
              defaultValue={data.filters.minimumBackers}
              placeholder="100"
              className="bs-field"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              State
            </span>
            <select
              name="rawState"
              defaultValue={data.filters.rawState}
              className="bs-field"
            >
              <option value="">All</option>
              {STATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Duration
            </span>
            <select
              name="durationBucket"
              defaultValue={data.filters.durationBucket}
              className="bs-field"
            >
              <option value="">All</option>
              <option value="short">Short (0-21d)</option>
              <option value="medium">Medium (22-35d)</option>
              <option value="long">Long (36d+)</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Minimum goal (raw amount)
            </span>
            <input
              type="number"
              name="minGoal"
              min="0"
              step="1"
              defaultValue={data.filters.minGoal}
              placeholder="10000"
              className="bs-field"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Completed outcomes
            </span>
            <select
              name="includeFailures"
              defaultValue={data.filters.includeFailures}
              className="bs-field"
            >
              <option value="true">Include successes and failures</option>
              <option value="false">Successful campaigns only</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Research coverage
            </span>
            <select
              name="fullyResearchableOnly"
              defaultValue={data.filters.fullyResearchableOnly}
              className="bs-field"
            >
              <option value="false">All imported campaigns</option>
              <option value="true">Fully researchable only</option>
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-3 2xl:col-span-4">
            <button type="submit" className="bs-button-primary">
              Analyze idea
            </button>
            <Link href="/" className="bs-button-secondary">
              Reset
            </Link>
            <p className="text-sm text-slate-500">
              Current data scope: TTRPG proof-of-concept subset from the August 12, 2026 snapshot.
            </p>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Comparable campaigns"
          value={formatInteger(data.summary.comparableCampaigns)}
          note="Campaigns in the current filtered slice that match the current research scope."
          accent
        />
        <MetricCard
          label="Success rate"
          value={formatPercent(data.summary.successRate)}
          note={`Based on ${formatInteger(data.summary.supportedOutcomeCount)} completed campaigns with successful or unsuccessful outcomes.`}
        />
        <MetricCard
          label="Median successful backers"
          value={formatInteger(data.summary.medianSuccessfulBackers)}
          note="A quick demand read using backers instead of cross-currency funding totals."
        />
        <MetricCard
          label="Recent campaigns"
          value={formatInteger(data.summary.recentCampaignCount)}
          note="Campaigns launched on or after August 17, 2024 inside the current slice."
        />
        <MetricCard
          label="Median successful funding multiple"
          value={formatMultiple(data.summary.medianSuccessfulFundingMultiple)}
          note="Funding multiple avoids the worst currency-comparison problems in this POC."
        />
        <MetricCard
          label="Fully researchable"
          value={formatInteger(data.summary.researchableCampaignCount)}
          note="Campaigns that already have the fields needed for direct human review."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <div className="bs-panel">
          <p className="bs-kicker">Research interpretation</p>
          <h2 className="bs-title mt-2 text-2xl font-semibold">
            What this slice suggests
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {interpretation.summary}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="bs-panel-subtle">
              <p className="bs-kicker">Strength</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {interpretation.strength}
              </p>
            </div>
            <div className="bs-panel-subtle">
              <p className="bs-kicker">Risk</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {interpretation.risk}
              </p>
            </div>
          </div>
        </div>

        <div className="bs-panel">
          <p className="bs-kicker">Category and taxonomy fit</p>
          <h2 className="bs-title mt-2 text-2xl font-semibold">
            Strongest classifications in this slice
          </h2>
          <div className="mt-6 grid gap-3">
            {data.taxonomy.length ? (
              data.taxonomy.map((row) => (
                <div
                  key={row.label}
                  className="bs-panel-subtle flex items-center justify-between gap-4"
                >
                  <p className="text-sm font-medium text-slate-900">{row.label}</p>
                  <span className="bs-data-chip bg-slate-900 text-white">
                    {formatInteger(row.campaignCount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="bs-panel-subtle">
                <p className="text-sm leading-7 text-slate-600">
                  No primary taxonomy labels are available for this filter slice yet.
                </p>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            This is the first-pass taxonomy fit only. It helps narrow the market slice but does not yet replace direct campaign review.
          </p>
        </div>
      </section>

      <section className="bs-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="bs-kicker">Trend and activity</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">
              Launch activity by year
            </h2>
          </div>
          <div className="bs-panel-subtle px-4 py-3">
            <p className="bs-kicker">Trend read</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {data.trendDirection === 'rising'
                ? 'Rising activity'
                : data.trendDirection === 'softening'
                  ? 'Softening activity'
                  : data.trendDirection === 'steady'
                    ? 'Steady activity'
                    : 'Insufficient data'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.trends.length ? (
            data.trends.slice(-8).map((row) => (
              <div key={row.launchYear} className="bs-panel-subtle">
                <p className="bs-kicker">{row.launchYear}</p>
                <p className="bs-title mt-2 text-2xl font-semibold">
                  {formatInteger(row.campaignCount)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Successful: {formatInteger(row.successfulCount)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Success rate: {formatPercent(row.successRate)}
                </p>
              </div>
            ))
          ) : (
            <div className="bs-panel-subtle md:col-span-2 xl:col-span-4">
              <p className="text-sm leading-7 text-slate-600">
                There is not enough launched campaign history inside the current slice to show a meaningful activity trend.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bs-panel">
        <p className="bs-kicker">Success vs failure</p>
        <h2 className="bs-title mt-2 text-2xl font-semibold">
          How winners and losers differ in this slice
        </h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.outcomes.length ? (
            data.outcomes.map((row) => (
              <div key={row.outcome} className="bs-panel-subtle">
                <p className="bs-kicker">{outcomeLabel(row.outcome)}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Campaigns
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatInteger(row.campaignCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Median backers
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatInteger(row.medianBackers)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Median duration
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatInteger(row.medianDurationDays)}d
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Median funding multiple
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatMultiple(row.medianFundingMultiple)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Fully researchable rate: {formatPercent(row.researchableRate)}
                </p>
              </div>
            ))
          ) : (
            <div className="bs-panel-subtle lg:col-span-2">
              <p className="text-sm leading-7 text-slate-600">
                Outcome comparison is unavailable because the current filters do not include enough completed campaigns.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bs-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="bs-kicker">Comparable campaigns</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">
              Historical campaigns to inspect next
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              These campaigns are ranked toward direct review value: researchable entries, stronger backer counts, and same-slice relevance rise to the top first.
            </p>
          </div>
          <div className="bs-panel-subtle px-4 py-3">
            <p className="bs-kicker">Next planned feature</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              Same-category compare and save workflows
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {data.campaigns.length ? (
            data.campaigns.map((campaign) => (
              <article
                key={campaign.campaignId}
                className="rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap gap-2">
                      <span className="bs-data-chip bg-slate-900 text-white">
                        {campaign.normalizedStatus}
                      </span>
                      {campaign.isFullyResearchable ? (
                        <span className="bs-data-chip bg-emerald-100 text-emerald-800">
                          Researchable
                        </span>
                      ) : null}
                      {campaign.categorySlug ? (
                        <span className="bs-data-chip bg-sky-100 text-sky-800">
                          Same-category compare ready
                        </span>
                      ) : null}
                    </div>
                    <h3 className="bs-title mt-4 text-2xl font-semibold">
                      {campaign.projectName}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {campaign.primaryClassificationLabel ?? 'Unclassified'} ·{' '}
                      {campaign.categoryName ?? 'Unknown category'} ·{' '}
                      {formatLaunchDate(campaign.launchedAt)}
                    </p>
                    {campaign.blurb ? (
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {campaign.blurb}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid min-w-[16rem] gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="bs-panel-subtle">
                      <p className="bs-kicker">Backers</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {formatInteger(campaign.backersCount)}
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
                        {campaign.campaignDurationDays === null
                          ? 'n/a'
                          : `${formatInteger(campaign.campaignDurationDays)}d`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
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
                  {campaign.categorySlug ? (
                    <Link
                      href={`/?categorySlug=${encodeURIComponent(campaign.categorySlug)}`}
                      className="bs-button-secondary"
                    >
                      Explore same category
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="bs-panel-subtle">
              <p className="text-sm leading-7 text-slate-600">
                No campaigns matched the current filter set. Try broadening the search text, lowering the minimum backer threshold, or reopening failures.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
