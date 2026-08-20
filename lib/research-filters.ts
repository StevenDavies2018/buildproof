import type { DashboardFilters } from '@/lib/dashboard'

export type ResearchFilterSearchParams = {
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
  launchWindow?: string
  minimumBackers?: string
  includeFailures?: string
  fullyResearchableOnly?: string
}

export function toDashboardFilters(params: ResearchFilterSearchParams): DashboardFilters {
  return {
    search: params.search,
    membershipStatus: params.membershipStatus,
    confidenceLabel: params.confidenceLabel,
    categorySlug: params.categorySlug,
    categoryParent: params.categoryParent,
    taxonomyLabel: params.taxonomyLabel,
    durationBucket: params.durationBucket,
    rawState: params.rawState,
    minGoal: params.minGoal,
    minPledged: params.minPledged,
    cardLimit: params.cardLimit,
    cardOffset: params.cardOffset,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    years: params.years,
    launchWindow: params.launchWindow,
    minimumBackers: params.minimumBackers,
    includeFailures: params.includeFailures,
    fullyResearchableOnly: params.fullyResearchableOnly,
  }
}
