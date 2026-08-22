'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

type TrackMode = 'dashboard' | 'reports' | 'compare' | 'campaign-detail'

function postEvent(eventName: string, surface: string, metadata?: Record<string, unknown>) {
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, surface, metadata }),
    keepalive: true,
  }).catch(() => undefined)
}

export function AnalyticsViewTracker({ mode }: { mode: TrackMode }) {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    const search = searchParams.get('search')?.trim() ?? ''

    postEvent('page_view', mode, { pathname: window.location.pathname })

    if (mode === 'dashboard') {
      const hasFilters = [
        'categoryParent',
        'categorySlug',
        'taxonomyLabel',
        'rawState',
        'durationBucket',
        'minGoal',
        'minPledged',
        'launchWindow',
        'minimumBackers',
      ].some((key) => (searchParams.get(key) ?? '').trim().length > 0)
      if (hasFilters) postEvent('dashboard_filter_applied', mode)
      if (search.length > 0) postEvent('dashboard_search_used', mode)
    }

    if (mode === 'reports') {
      const hasFilters = [
        'categoryParent',
        'categorySlug',
        'taxonomyLabel',
        'rawState',
        'durationBucket',
        'minGoal',
        'minPledged',
        'launchWindow',
        'minimumBackers',
        'window',
        'year',
      ].some((key) => (searchParams.get(key) ?? '').trim().length > 0)
      if (hasFilters) postEvent('report_filter_applied', mode)
      if ((searchParams.get('taxonomyLabel') ?? '').trim().length > 0) {
        postEvent('report_loaded', mode)
      }
    }
  }, [mode, pathname])

  return null
}
