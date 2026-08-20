import AdminSubsetOverview from '@/components/admin-subset-overview'
import ViewStatePersistence from '@/components/view-state-persistence'
import { type AdminSubsetFilters } from '@/lib/admin'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminPage({
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
    minPledged?: string
    sortBy?: string
    sortDir?: string
  }>
}) {
  await requireAdmin()
  const resolvedSearchParams = (await searchParams) ?? {}

  const filters: AdminSubsetFilters = {
    search: resolvedSearchParams.search,
    membershipStatus: resolvedSearchParams.membershipStatus,
    confidenceLabel: resolvedSearchParams.confidenceLabel,
    categorySlug: resolvedSearchParams.categorySlug,
    durationBucket: resolvedSearchParams.durationBucket,
    rawState: resolvedSearchParams.rawState,
    minGoal: resolvedSearchParams.minGoal,
    minPledged: resolvedSearchParams.minPledged,
    sortBy: resolvedSearchParams.sortBy,
    sortDir: resolvedSearchParams.sortDir,
  }

  return (
    <main className="bs-shell overflow-x-hidden">
      <ViewStatePersistence />
      <div className="bs-container">
        <AdminSubsetOverview filters={filters} />
      </div>
    </main>
  )
}
