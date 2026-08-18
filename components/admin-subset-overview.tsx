import Link from 'next/link'
import { updateSubsetMembershipAction } from '@/app/admin/actions'
import { type AdminSubsetFilters, getAdminSubsetOverview } from '@/lib/admin'

function CountCard({
  label,
  value,
  tone = 'stone',
}: {
  label: string
  value: string | number
  tone?: 'stone' | 'amber'
}) {
  const toneClass =
    tone === 'amber' ? 'bs-metric-card bs-metric-card-accent' : 'bs-metric-card'

  return (
    <div className={toneClass}>
      <p className="bs-kicker">{label}</p>
      <p className="bs-title mt-3 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function formatMoney(value: string | null) {
  if (!value) return 'n/a'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric)
}

function formatNativeMoney(value: string | null, currency: string | null) {
  if (!value) return 'n/a'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'n/a'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)} ${currency?.toUpperCase() ?? 'native'}`
}

function formatDuration(value: number | null) {
  if (value === null || value === undefined) return 'n/a'
  return `${value}d`
}

function formatLabels(labels: string[]) {
  if (!labels.length) return 'Unclassified'
  return labels.join(', ')
}

function statusBadge(value: string) {
  const className =
    value === 'include_medium'
      ? 'bg-sky-100 text-sky-800'
      : value === 'include_high'
        ? 'bg-emerald-100 text-emerald-800'
        : value === 'review'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-stone-200 text-stone-800'

  return (
    <span className={`bs-data-chip ${className}`}>
      {value}
    </span>
  )
}

function buildQueryString(filters: AdminSubsetFilters) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

function SortHeader({
  label,
  sortKey,
  filters,
}: {
  label: string
  sortKey: string
  filters: AdminSubsetFilters
}) {
  const currentSort = filters.sortBy ?? 'membership'
  const currentDir = filters.sortDir ?? 'asc'
  const nextDir =
    currentSort === sortKey && currentDir === 'asc' ? 'desc' : 'asc'

  const nextFilters: AdminSubsetFilters = {
    ...filters,
    sortBy: sortKey,
    sortDir: nextDir,
  }

  const isActive = currentSort === sortKey
  const arrow = !isActive ? '+-' : currentDir === 'asc' ? '^' : 'v'

  return (
    <Link
      href={`/admin${buildQueryString(nextFilters)}`}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
        isActive
          ? 'bg-white text-slate-950 shadow-sm'
          : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs">{arrow}</span>
    </Link>
  )
}

const MEMBERSHIP_OPTIONS = [
  'include_high',
  'include_medium',
  'review',
  'exclude',
]

const CONFIDENCE_OPTIONS = ['include_high', 'include_medium', 'review']
const STATE_OPTIONS = [
  'successful',
  'failed',
  'canceled',
  'submitted',
  'live',
  'started',
  'suspended',
]

function membershipLabel(value: string) {
  switch (value) {
    case 'include_high':
      return 'Included'
    case 'include_medium':
      return 'Included'
    case 'review':
      return 'Needs review'
    case 'exclude':
      return 'Excluded'
    default:
      return value
  }
}

function confidenceLabelText(value: string) {
  switch (value) {
    case 'include_high':
      return 'High confidence'
    case 'include_medium':
      return 'Medium confidence'
    case 'review':
      return 'Low confidence / unclear'
    default:
      return value
  }
}

function FilterField({
  label,
  children,
  wide = false,
  wideAt2xl = false,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
  wideAt2xl?: boolean
}) {
  return (
    <label
      className={`grid min-w-0 gap-2 text-sm text-slate-700 ${
        wide ? 'lg:col-span-2' : ''
      } ${wideAt2xl ? '2xl:col-span-2' : ''}`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function StatBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="bs-kicker">{label}</p>
      {children}
    </div>
  )
}

export default async function AdminSubsetOverview({
  filters,
}: {
  filters: AdminSubsetFilters
}) {
  const data = await getAdminSubsetOverview(filters)
  const currentAdminPath = `/admin${buildQueryString(data.filters)}`

  const totalCampaigns = data.summary.reduce(
    (sum, row) => sum + row.campaignCount,
    0,
  )
  const activeVersions = new Set(data.summary.map((row) => row.subsetVersion)).size

  if (!data.configured) {
    return (
      <section className="bs-panel">
        <h2 className="bs-title text-2xl font-semibold">Admin View</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          `POSTGRES_URL` is not configured yet, so the internal curation
          surface cannot query subset memberships.
        </p>
      </section>
    )
  }

  return (
    <section className="grid min-w-0 gap-6">
      <div className="bs-panel min-w-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="bs-kicker">Admin View</p>
            <h1 className="bs-title mt-2 text-4xl font-semibold">
              TTRPG subset curation overview
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              This is the first internal review surface for the Backer Sonar
              proof of concept. It shows the imported subset membership state so
              we can move from broad extraction toward curated research data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/" className="bs-button-secondary">
              Back to overview
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <CountCard label="Subset campaigns" value={totalCampaigns} tone="amber" />
          <CountCard
            label="Classified campaigns"
            value={data.classificationSummary.classifiedCampaigns}
          />
          <CountCard label="Rows shown below" value={data.campaigns.length} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <CountCard label="Subset versions" value={activeVersions} />
          <CountCard
            label="Taxonomy nodes"
            value={data.classificationSummary.taxonomyNodes}
          />
          <CountCard
            label="Classification rows"
            value={data.classificationSummary.classificationRows}
          />
        </div>

        <form
          method="get"
          action="/admin"
          className="bs-toolbar mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          <FilterField label="Search" wide wideAt2xl>
            <input
              type="text"
              name="search"
              defaultValue={data.filters.search ?? ''}
              placeholder="Project, blurb, creator"
              className="bs-field"
            />
          </FilterField>

          <FilterField label="Minimum Goal (USD)">
            <input
              type="number"
              name="minGoal"
              min="0"
              step="1"
              defaultValue={data.filters.minGoal ?? ''}
              placeholder="10000"
              className="bs-field"
            />
          </FilterField>

          <FilterField label="Membership">
            <select
              name="membershipStatus"
              defaultValue={data.filters.membershipStatus ?? ''}
              className="bs-field"
            >
              <option value="">All</option>
              {MEMBERSHIP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Confidence">
            <select
              name="confidenceLabel"
              defaultValue={data.filters.confidenceLabel ?? ''}
              className="bs-field"
            >
              <option value="">All</option>
              <option value="include_high">include_high</option>
              <option value="include_medium">include_medium</option>
              <option value="review">review</option>
            </select>
          </FilterField>

          <FilterField label="Category" wideAt2xl>
            <select
              name="categorySlug"
              defaultValue={data.filters.categorySlug ?? ''}
              className="bs-field"
            >
              <option value="">All</option>
              {data.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="State">
            <select
              name="rawState"
              defaultValue={data.filters.rawState ?? ''}
              className="bs-field"
            >
              <option value="">All</option>
              {STATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Duration">
            <select
              name="durationBucket"
              defaultValue={data.filters.durationBucket ?? ''}
              className="bs-field"
            >
              <option value="">All</option>
              <option value="short">Short (0-21d)</option>
              <option value="medium">Medium (22-35d)</option>
              <option value="long">Long (36d+)</option>
              <option value="unknown">Unknown</option>
            </select>
          </FilterField>

          <div className="flex flex-wrap items-end gap-3 2xl:col-span-4">
            <button type="submit" className="bs-button-primary">
              Apply filters
            </button>
            <Link href="/admin" className="bs-button-secondary">
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="bs-panel min-w-0">
        <h2 className="bs-title text-2xl font-semibold">Membership summary</h2>
        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-bs-border">
          <table className="min-w-full divide-y divide-bs-border text-sm">
            <thead className="bg-bs-panelAlt">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 font-semibold">Subset</th>
                <th className="px-4 py-3 font-semibold">Version</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Confidence</th>
                <th className="px-4 py-3 font-semibold">Campaigns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bs-border bg-white">
              {data.summary.map((row) => (
                <tr
                  key={`${row.subsetKey}-${row.subsetVersion}-${row.membershipStatus}-${row.confidenceLabel ?? 'none'}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-950">{row.subsetKey}</td>
                  <td className="px-4 py-3 text-slate-700">{row.subsetVersion}</td>
                  <td className="px-4 py-3">{statusBadge(row.membershipStatus)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.confidenceLabel ?? 'n/a'}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.campaignCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bs-panel min-w-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="bs-title text-2xl font-semibold">Campaign review queue</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The first 100 subset campaigns matching the current filters.
              This is the first curation workflow for adjusting subset
              membership, confidence, and first-pass taxonomy labels.
            </p>
          </div>
          <p className="bs-kicker">Editable</p>
        </div>

        <div className="bs-toolbar mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="bs-kicker self-center">Sort by</span>
          <SortHeader label="Project" sortKey="projectName" filters={data.filters} />
          <SortHeader label="Category" sortKey="category" filters={data.filters} />
          <SortHeader label="State" sortKey="state" filters={data.filters} />
          <SortHeader label="Membership" sortKey="membership" filters={data.filters} />
          <SortHeader label="Confidence" sortKey="confidence" filters={data.filters} />
          <SortHeader label="Duration" sortKey="duration" filters={data.filters} />
          <SortHeader label="Goal" sortKey="goal" filters={data.filters} />
          <SortHeader label="Pledged" sortKey="pledged" filters={data.filters} />
          <SortHeader label="Backers" sortKey="backers" filters={data.filters} />
        </div>

        <div className="mt-6 grid gap-4">
          {data.campaigns.map((campaign) => (
            <article
              key={`${campaign.subsetKey}-${campaign.subsetVersion}-${campaign.campaignId}`}
              className="rounded-[1.5rem] border border-bs-border bg-bs-panelAlt p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.9fr)]">
                <div className="space-y-2">
                  <p className="bs-title break-words text-xl font-semibold leading-8">
                    {campaign.projectName}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                    KS #{campaign.kickstarterProjectId}
                  </p>
                  {campaign.blurb ? (
                    <p className="break-words text-sm leading-7 text-slate-600">
                      {campaign.blurb}
                    </p>
                  ) : null}
                  {campaign.projectUrl ? (
                    <a
                      href={campaign.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-medium text-bs-accent underline underline-offset-4 hover:text-amber-900"
                    >
                      View Kickstarter
                    </a>
                  ) : (
                    <span className="text-sm text-slate-500">Source unavailable</span>
                  )}
                </div>

                <form
                  action={updateSubsetMembershipAction}
                  className="bs-panel-subtle grid gap-2 self-start"
                >
                  <input type="hidden" name="campaignId" value={campaign.campaignId} />
                  <input type="hidden" name="subsetKey" value={campaign.subsetKey} />
                  <input
                    type="hidden"
                    name="subsetVersion"
                    value={campaign.subsetVersion}
                  />
                  <input type="hidden" name="returnTo" value={currentAdminPath} />
                  <p className="bs-kicker">Update Membership</p>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Subset decision
                    </span>
                    <select
                      name="membershipStatus"
                      defaultValue={campaign.membershipStatus}
                      className="bs-field"
                    >
                      {MEMBERSHIP_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {membershipLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Decision confidence
                    </span>
                    <select
                      name="confidenceLabel"
                      defaultValue={campaign.confidenceLabel ?? ''}
                      className="bs-field"
                    >
                      <option value="">Not set</option>
                      {CONFIDENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {confidenceLabelText(option)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="bs-button-primary">
                    Save
                  </button>
                </form>
              </div>

              <div className="mt-5 grid gap-4 border-t border-bs-border pt-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                <StatBlock label="Category">
                  <p className="text-sm text-slate-800">{campaign.categoryName ?? 'n/a'}</p>
                  <p className="break-words text-xs text-slate-500">
                    {campaign.categorySlug ?? 'n/a'}
                  </p>
                </StatBlock>

                <StatBlock label="State">
                  <p className="text-sm text-slate-800">{campaign.rawState ?? 'n/a'}</p>
                  <p className="text-xs text-slate-500">{campaign.normalizedStatus}</p>
                </StatBlock>

                <StatBlock label="Membership">
                  <div>{statusBadge(campaign.membershipStatus)}</div>
                </StatBlock>

                <StatBlock label="Confidence">
                  <p className="text-sm text-slate-800">
                    {campaign.confidenceLabel ?? 'n/a'}
                  </p>
                </StatBlock>

                <StatBlock label="Duration">
                  <p className="font-mono text-sm text-slate-800">
                    {formatDuration(campaign.campaignDurationDays)}
                  </p>
                </StatBlock>

                <StatBlock label="Goal">
                  <p className="font-mono text-sm text-slate-800">
                    {formatMoney(campaign.goalUsd)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Native: {formatNativeMoney(campaign.goal, campaign.currency)}
                  </p>
                </StatBlock>

                <StatBlock label="Pledged">
                  <p className="font-mono text-sm text-slate-800">
                    {formatMoney(campaign.pledgedUsd)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Native: {formatNativeMoney(campaign.pledged, campaign.currency)}
                  </p>
                </StatBlock>

                <StatBlock label="Backers">
                  <p className="font-mono text-sm text-slate-800">
                    {campaign.backersCount ?? 'n/a'}
                  </p>
                </StatBlock>
              </div>

              <div className="mt-4 space-y-1">
                <p className="bs-kicker">Taxonomy</p>
                <p className="text-sm font-medium text-slate-900">
                  {campaign.primaryClassificationLabel ?? 'Unclassified'}
                </p>
                <p className="break-words text-xs leading-5 text-slate-500">
                  {formatLabels(campaign.taxonomyLabels)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
