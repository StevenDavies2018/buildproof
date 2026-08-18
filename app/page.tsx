import ResearchDashboard from '@/components/research-dashboard'
import { type DashboardFilters } from '@/lib/dashboard'

export const preferredRegion = 'home'
export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string
    search?: string
    membershipStatus?: string
    confidenceLabel?: string
    categorySlug?: string
    taxonomyLabel?: string
    durationBucket?: string
    rawState?: string
    minGoal?: string
    cardLimit?: string
    sortBy?: string
    sortDir?: string
    years?: string
    compare?: string
    launchWindow?: string
    minimumBackers?: string
    includeFailures?: string
    fullyResearchableOnly?: string
  }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}

  const filters: DashboardFilters = {
    view: resolvedSearchParams.view,
    search: resolvedSearchParams.search,
    membershipStatus: resolvedSearchParams.membershipStatus,
    confidenceLabel: resolvedSearchParams.confidenceLabel,
    categorySlug: resolvedSearchParams.categorySlug,
    taxonomyLabel: resolvedSearchParams.taxonomyLabel,
    durationBucket: resolvedSearchParams.durationBucket,
    rawState: resolvedSearchParams.rawState,
    minGoal: resolvedSearchParams.minGoal,
    cardLimit: resolvedSearchParams.cardLimit,
    sortBy: resolvedSearchParams.sortBy,
    sortDir: resolvedSearchParams.sortDir,
    years: resolvedSearchParams.years,
    launchWindow: resolvedSearchParams.launchWindow,
    minimumBackers: resolvedSearchParams.minimumBackers,
    includeFailures: resolvedSearchParams.includeFailures,
    fullyResearchableOnly: resolvedSearchParams.fullyResearchableOnly,
  }
  const compareIds = (resolvedSearchParams.compare ?? '')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value))
    .slice(0, 4)

  return (
    <main className="bs-shell">
      <div className="bs-container">
        <ResearchDashboard filters={filters} compareIds={compareIds} />
      </div>
    </main>
  )
}
