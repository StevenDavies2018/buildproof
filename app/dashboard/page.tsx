import ResearchDashboard from '@/components/research-dashboard'
import { SavedResearchPanel } from '@/components/saved-research'
import { type DashboardFilters } from '@/lib/dashboard'
import { toDashboardFilters } from '@/lib/research-filters'

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
    categoryParent?: string
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
    ...toDashboardFilters(resolvedSearchParams),
    view: resolvedSearchParams.view,
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
