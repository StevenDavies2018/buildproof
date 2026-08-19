import ResearchDashboard from '@/components/research-dashboard'
import { SavedResearchPanel } from '@/components/saved-research'
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
    minPledged?: string
    cardLimit?: string
    cardOffset?: string
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
    minPledged: resolvedSearchParams.minPledged,
    cardLimit: resolvedSearchParams.cardLimit,
    cardOffset: resolvedSearchParams.cardOffset,
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
      <div className="mx-auto grid w-full max-w-[96rem] min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <ResearchDashboard filters={filters} compareIds={compareIds} startMode />
        <SavedResearchPanel />
      </div>
    </main>
  )
}
