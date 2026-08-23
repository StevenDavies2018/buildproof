import { NextResponse } from 'next/server'
import { type DashboardFilters, getDashboardOverview } from '@/lib/dashboard'
import { getCurrentUser, isTrialExpired } from '@/lib/auth'

const FILTER_KEYS: Array<keyof DashboardFilters> = [
  'search',
  'membershipStatus',
  'confidenceLabel',
  'categorySlug',
  'categoryParent',
  'taxonomyLabel',
  'durationBucket',
  'rawState',
  'minGoal',
  'minPledged',
  'years',
  'launchWindow',
  'minimumBackers',
  'includeFailures',
  'fullyResearchableOnly',
]

export async function GET(request: Request) {
  // Same rationale as /api/research/analyze: this triggers the same query
  // /dashboard and /reports gate behind requireActivePlan(), and had no
  // equivalent check of its own.
  const user = await getCurrentUser()
  if (!user || isTrialExpired(user)) {
    return NextResponse.json({ error: 'Sign in with an active trial or paid plan is required.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filters = FILTER_KEYS.reduce<DashboardFilters>((result, key) => {
    const value = searchParams.get(key)
    if (value !== null) {
      result[key] = value
    }
    return result
  }, {})

  try {
    const overview = await getDashboardOverview({
      ...filters,
      taxonomyLabel: '',
      cardLimit: '12',
      cardOffset: '0',
      sortBy: 'recommended',
      sortDir: 'desc',
    })

    if (!overview.configured) {
      return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
    }

    return NextResponse.json({
      taxonomy: overview.taxonomy,
    })
  } catch (error) {
    console.error('Taxonomy options lookup failed', error)
    return NextResponse.json(
      { error: 'Taxonomy options could not be loaded.' },
      { status: 503 },
    )
  }
}
