import { Suspense } from 'react'
import ResearchDashboard from '@/components/research-dashboard'
import SchemaStatus from '@/components/schema-status'
import TablePlaceholder from '@/components/table-placeholder'
import { type DashboardFilters } from '@/lib/dashboard'

export const preferredRegion = 'home'
export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{
    search?: string
    membershipStatus?: string
    confidenceLabel?: string
    categorySlug?: string
    durationBucket?: string
    rawState?: string
    minGoal?: string
    launchWindow?: string
    minimumBackers?: string
    includeFailures?: string
    fullyResearchableOnly?: string
  }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}

  const filters: DashboardFilters = {
    search: resolvedSearchParams.search,
    membershipStatus: resolvedSearchParams.membershipStatus,
    confidenceLabel: resolvedSearchParams.confidenceLabel,
    categorySlug: resolvedSearchParams.categorySlug,
    durationBucket: resolvedSearchParams.durationBucket,
    rawState: resolvedSearchParams.rawState,
    minGoal: resolvedSearchParams.minGoal,
    launchWindow: resolvedSearchParams.launchWindow,
    minimumBackers: resolvedSearchParams.minimumBackers,
    includeFailures: resolvedSearchParams.includeFailures,
    fullyResearchableOnly: resolvedSearchParams.fullyResearchableOnly,
  }

  return (
    <main className="bs-shell">
      <div className="bs-container">
        <ResearchDashboard filters={filters} />

        <Suspense fallback={<TablePlaceholder />}>
          <SchemaStatus />
        </Suspense>
      </div>
    </main>
  )
}
