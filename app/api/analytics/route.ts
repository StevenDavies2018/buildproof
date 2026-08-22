import { NextResponse } from 'next/server'
import { type AnalyticsEventName, recordAnalyticsEvent } from '@/lib/analytics'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set<AnalyticsEventName>([
  'account_return_to_last_view',
  'campaign_detail_opened',
  'compare_selection_changed',
  'page_view',
  'dashboard_filter_applied',
  'dashboard_search_used',
  'saved_item_reopened',
  'report_filter_applied',
  'report_category_card_opened',
  'report_loaded',
  'report_supporting_campaign_opened',
  'help_opened',
])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, ignored: true })
  }

  const body = (await request.json()) as {
    eventName?: AnalyticsEventName
    surface?: string
    metadata?: Record<string, unknown>
  }

  if (!body.eventName || !body.surface || !ALLOWED_EVENTS.has(body.eventName)) {
    return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 })
  }

  await recordAnalyticsEvent({
    userId: user.id,
    eventName: body.eventName,
    surface: body.surface,
    metadata: body.metadata,
  })

  return NextResponse.json({ ok: true })
}
