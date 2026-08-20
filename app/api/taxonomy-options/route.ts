import { NextResponse } from 'next/server'
import { type DashboardFilters, getDashboardOverview } from '@/lib/dashboard'

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
