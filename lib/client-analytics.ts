'use client'

import type { AnalyticsEventName } from '@/lib/analytics'

export function postAnalyticsEvent(
  eventName: AnalyticsEventName,
  surface: string,
  metadata?: Record<string, unknown>,
) {
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, surface, metadata }),
    keepalive: true,
  }).catch(() => undefined)
}
