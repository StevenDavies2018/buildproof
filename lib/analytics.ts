import { getSql, hasDatabaseConfig } from '@/lib/db'

export type AnalyticsEventName =
  | 'account_created'
  | 'account_return_to_last_view'
  | 'compare_selection_changed'
  | 'email_verified'
  | 'campaign_detail_opened'
  | 'report_category_card_opened'
  | 'report_supporting_campaign_opened'
  | 'sign_in'
  | 'sign_out'
  | 'page_view'
  | 'dashboard_filter_applied'
  | 'dashboard_search_used'
  | 'saved_item_reopened'
  | 'report_filter_applied'
  | 'report_loaded'
  | 'saved_item_created'
  | 'saved_item_deleted'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'help_opened'
  | 'ai_copilot_enabled'
  | 'ai_copilot_disabled'
  | 'ai_copilot_brief_generated'

export async function recordAnalyticsEvent(input: {
  userId?: number | null
  eventName: AnalyticsEventName
  surface: string
  metadata?: Record<string, unknown>
}) {
  if (!hasDatabaseConfig()) return
  const sql = getSql()
  try {
    await sql`
      INSERT INTO app_analytics_events (user_id, event_name, surface, metadata_json)
      VALUES (
        ${input.userId ?? null},
        ${input.eventName},
        ${input.surface},
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
    `
  } finally {
    await sql.end()
  }
}

export type AdminUsageUserRow = {
  userId: number
  username: string
  email: string
  role: 'user' | 'admin'
  signIns: number
  dashboardViews: number
  reportViews: number
  detailViews: number
  compareViews: number
  searches: number
  reportLoads: number
  savedItemsCreated: number
  savedItemsReopened: number
  compareSelections: number
  accountReturns: number
  onboardingHelpUsage: number
  accountLengthDays: number
  daysToAccountExpiry: number | null
  accountType: 'free' | 'paid'
}

export type AdminUsageOverview = {
  configured: boolean
  rows: AdminUsageUserRow[]
}

export async function getAdminUsageOverview(): Promise<AdminUsageOverview> {
  if (!hasDatabaseConfig()) {
    return { configured: false, rows: [] }
  }

  const sql = getSql()
  try {
    const rows = await sql<AdminUsageUserRow[]>`
      WITH event_counts AS (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE event_name = 'sign_in')::int AS sign_ins,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'dashboard')::int AS dashboard_views,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'reports')::int AS report_views,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'campaign-detail')::int AS detail_views,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'compare')::int AS compare_views,
          COUNT(*) FILTER (WHERE event_name IN ('dashboard_search_used', 'report_filter_applied'))::int AS searches,
          COUNT(*) FILTER (WHERE event_name = 'report_loaded')::int AS report_loads,
          COUNT(*) FILTER (WHERE event_name = 'saved_item_created')::int AS saved_items_created,
          COUNT(*) FILTER (WHERE event_name = 'saved_item_reopened')::int AS saved_items_reopened,
          COUNT(*) FILTER (WHERE event_name = 'compare_selection_changed')::int AS compare_selections,
          COUNT(*) FILTER (WHERE event_name = 'account_return_to_last_view')::int AS account_returns,
          COUNT(*) FILTER (WHERE event_name IN ('onboarding_completed', 'onboarding_skipped', 'help_opened'))::int AS onboarding_help_usage
        FROM app_analytics_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT
        u.id AS "userId",
        u.display_name AS username,
        u.email,
        u.role,
        COALESCE(ec.sign_ins, 0)::int AS "signIns",
        COALESCE(ec.dashboard_views, 0)::int AS "dashboardViews",
        COALESCE(ec.report_views, 0)::int AS "reportViews",
        COALESCE(ec.detail_views, 0)::int AS "detailViews",
        COALESCE(ec.compare_views, 0)::int AS "compareViews",
        COALESCE(ec.searches, 0)::int AS searches,
        COALESCE(ec.report_loads, 0)::int AS "reportLoads",
        COALESCE(ec.saved_items_created, 0)::int AS "savedItemsCreated",
        COALESCE(ec.saved_items_reopened, 0)::int AS "savedItemsReopened",
        COALESCE(ec.compare_selections, 0)::int AS "compareSelections",
        COALESCE(ec.account_returns, 0)::int AS "accountReturns",
        COALESCE(ec.onboarding_help_usage, 0)::int AS "onboardingHelpUsage",
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.created_at)) / 86400))::int AS "accountLengthDays",
        CASE
          WHEN u.account_type = 'paid' THEN NULL
          ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - CURRENT_TIMESTAMP)) / 86400))::int
        END AS "daysToAccountExpiry",
        u.account_type AS "accountType"
      FROM app_users u
      LEFT JOIN event_counts ec ON ec.user_id = u.id
      ORDER BY u.created_at DESC, u.id DESC
    `

    return {
      configured: true,
      rows,
    }
  } finally {
    await sql.end()
  }
}
