import AdminSubsetOverview from '@/components/admin-subset-overview'
import { type AdminSubsetFilters } from '@/lib/admin'

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
    sortBy?: string
    sortDir?: string
  }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}

  const filters: AdminSubsetFilters = {
    search: resolvedSearchParams.search,
    membershipStatus: resolvedSearchParams.membershipStatus,
    confidenceLabel: resolvedSearchParams.confidenceLabel,
    categorySlug: resolvedSearchParams.categorySlug,
    durationBucket: resolvedSearchParams.durationBucket,
    rawState: resolvedSearchParams.rawState,
    minGoal: resolvedSearchParams.minGoal,
    sortBy: resolvedSearchParams.sortBy,
    sortDir: resolvedSearchParams.sortDir,
  }

  return (
    <main className="bs-shell overflow-x-hidden">
      <div className="bs-container">
        <AdminSubsetOverview filters={filters} />
      </div>
    </main>
  )
}
