import { AnalyticsViewTracker } from '@/components/analytics-view-tracker'
import ResearchDashboard from '@/components/research-dashboard'
import { SavedResearchPanel } from '@/components/saved-research'
import ViewStatePersistence from '@/components/view-state-persistence'
import { getUserEntitlements, requireActivePlan } from '@/lib/auth'
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
  const user = await requireActivePlan('/account?error=Your%20free%20trial%20has%20ended.%20Upgrade%20to%20keep%20using%20User%20View.')
  const resolvedSearchParams = (await searchParams) ?? {}
  const entitlements = getUserEntitlements(user)

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
      <ViewStatePersistence />
      <AnalyticsViewTracker mode="dashboard" />
      <div className="mx-auto grid w-full max-w-[96rem] min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <ResearchDashboard
          filters={filters}
          compareIds={compareIds}
          startMode
          entitlements={entitlements}
        />
        
        <SavedResearchPanel />
      </div>
    </main>
  )
}
