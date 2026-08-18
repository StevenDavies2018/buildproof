import { NextResponse } from 'next/server'
import { type DashboardFilters, getDashboardOverview } from '@/lib/dashboard'

const FILTER_KEYS: Array<keyof DashboardFilters> = [
  'membershipStatus',
  'confidenceLabel',
  'categorySlug',
  'taxonomyLabel',
  'durationBucket',
  'rawState',
  'minGoal',
  'cardLimit',
  'sortBy',
  'sortDir',
  'years',
  'launchWindow',
  'minimumBackers',
  'includeFailures',
  'fullyResearchableOnly',
]

function readFilters(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as DashboardFilters
  }

  const input = value as Record<string, unknown>
  return FILTER_KEYS.reduce<DashboardFilters>((filters, key) => {
    const filterValue = input[key]
    if (typeof filterValue === 'string') filters[key] = filterValue
    return filters
  }, {})
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const idea = typeof input.idea === 'string' ? input.idea.trim() : ''
  if (idea.length < 2) {
    return NextResponse.json(
      { error: 'Provide a research idea with at least two characters.' },
      { status: 400 },
    )
  }

  try {
    const filters = readFilters(input.filters)
    const result = await getDashboardOverview({
      ...filters,
      search: idea,
      sortBy: filters.sortBy || 'recommended',
    })

    if (!result.configured) {
      return NextResponse.json({ error: 'The research database is not configured.' }, { status: 503 })
    }

    return NextResponse.json({
      query: {
        idea,
        terms: result.queryTerms,
        rankingVersion: result.rankingVersion,
        filters: result.filters,
      },
      summary: result.summary,
      campaigns: result.campaigns,
    })
  } catch (error) {
    console.error('Deterministic research query failed', error)
    return NextResponse.json(
      { error: 'The research query could not be completed. Please retry.' },
      { status: 503 },
    )
  }
}
