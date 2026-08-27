import { randomBytes, scryptSync } from 'node:crypto'
import { getSql, hasDatabaseConfig } from '@/lib/db'

export type AdminUserSummary = {
  totalUsers: number
  adminUsers: number
  verifiedUsers: number
  googleUsers: number
  consentCompleteUsers: number
  activeSessions: number
  savedResearchItems: number
}

export type AdminUserRow = {
  id: number
  email: string
  displayName: string
  role: 'user' | 'admin'
  accountType: 'free' | 'paid'
  trialEndsAt: string | null
  googleSubject: string | null
  createdAt: string
  updatedAt: string
  emailVerifiedAt: string | null
  termsAcceptedAt: string | null
  privacyAcceptedAt: string | null
  legalDisclaimerAcknowledgedAt: string | null
  savedItemCount: number
  sessionCount: number
  researchViewCount: number
  campaignSaveCount: number
  comparisonSaveCount: number
  signInCount: number
  dashboardViewCount: number
  reportViewCount: number
  detailViewCount: number
  compareViewCount: number
  searchCount: number
  reportLoadCount: number
  savedItemCreateCount: number
  savedItemReopenCount: number
  compareSelectionCount: number
  accountReturnCount: number
  onboardingHelpCount: number
  onboardingStatus: string | null
  onboardingUpdatedAt: string | null
}

export type AdminUsersOverview = {
  configured: boolean
  summary: AdminUserSummary
  users: AdminUserRow[]
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function getAdminUsersOverview(): Promise<AdminUsersOverview> {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      summary: {
        totalUsers: 0,
        adminUsers: 0,
        verifiedUsers: 0,
        googleUsers: 0,
        consentCompleteUsers: 0,
        activeSessions: 0,
        savedResearchItems: 0,
      },
      users: [],
    }
  }

  const sql = getSql()

  try {
    const [summary] = await sql<AdminUserSummary[]>`
      SELECT
        COUNT(*)::int AS "totalUsers",
        COUNT(*) FILTER (WHERE role = 'admin')::int AS "adminUsers",
        COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL)::int AS "verifiedUsers",
        COUNT(*) FILTER (WHERE google_subject IS NOT NULL)::int AS "googleUsers",
        COUNT(*) FILTER (
          WHERE terms_accepted_at IS NOT NULL
            AND privacy_accepted_at IS NOT NULL
            AND legal_disclaimer_acknowledged_at IS NOT NULL
        )::int AS "consentCompleteUsers",
        (SELECT COUNT(*)::int FROM app_sessions WHERE expires_at > CURRENT_TIMESTAMP) AS "activeSessions",
        (SELECT COUNT(*)::int FROM saved_research_items) AS "savedResearchItems"
      FROM app_users
    `

    const users = await sql<AdminUserRow[]>`
      WITH saved_counts AS (
        SELECT
          user_id,
          COUNT(*)::int AS saved_item_count,
          COUNT(*) FILTER (WHERE item_type = 'research')::int AS research_view_count,
          COUNT(*) FILTER (WHERE item_type = 'campaign')::int AS campaign_save_count,
          COUNT(*) FILTER (WHERE item_type = 'comparison')::int AS comparison_save_count
        FROM saved_research_items
        GROUP BY user_id
      ),
      session_counts AS (
        SELECT user_id, COUNT(*)::int AS session_count
        FROM app_sessions
        WHERE expires_at > CURRENT_TIMESTAMP
        GROUP BY user_id
      ),
      event_counts AS (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE event_name = 'sign_in')::int AS sign_in_count,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'dashboard')::int AS dashboard_view_count,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'reports')::int AS report_view_count,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'campaign-detail')::int AS detail_view_count,
          COUNT(*) FILTER (WHERE event_name = 'page_view' AND surface = 'compare')::int AS compare_view_count,
          COUNT(*) FILTER (WHERE event_name IN ('dashboard_search_used', 'report_filter_applied'))::int AS search_count,
          COUNT(*) FILTER (WHERE event_name = 'report_loaded')::int AS report_load_count,
          COUNT(*) FILTER (WHERE event_name = 'saved_item_created')::int AS saved_item_create_count,
          COUNT(*) FILTER (WHERE event_name = 'saved_item_reopened')::int AS saved_item_reopen_count,
          COUNT(*) FILTER (WHERE event_name = 'compare_selection_changed')::int AS compare_selection_count,
          COUNT(*) FILTER (WHERE event_name = 'account_return_to_last_view')::int AS account_return_count,
          COUNT(*) FILTER (WHERE event_name IN ('onboarding_completed', 'onboarding_skipped', 'help_opened'))::int AS onboarding_help_count
        FROM app_analytics_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ),
      onboarding_latest AS (
        SELECT DISTINCT ON (user_id)
          user_id,
          status,
          updated_at
        FROM user_onboarding_states
        ORDER BY user_id, updated_at DESC
      )
      SELECT
        u.id,
        u.email,
        u.display_name AS "displayName",
        u.role,
        u.account_type AS "accountType",
        u.trial_ends_at AS "trialEndsAt",
        u.google_subject AS "googleSubject",
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        u.email_verified_at AS "emailVerifiedAt",
        u.terms_accepted_at AS "termsAcceptedAt",
        u.privacy_accepted_at AS "privacyAcceptedAt",
        u.legal_disclaimer_acknowledged_at AS "legalDisclaimerAcknowledgedAt",
        COALESCE(sc.saved_item_count, 0)::int AS "savedItemCount",
        COALESCE(ac.session_count, 0)::int AS "sessionCount",
        COALESCE(sc.research_view_count, 0)::int AS "researchViewCount",
        COALESCE(sc.campaign_save_count, 0)::int AS "campaignSaveCount",
        COALESCE(sc.comparison_save_count, 0)::int AS "comparisonSaveCount",
        COALESCE(ec.sign_in_count, 0)::int AS "signInCount",
        COALESCE(ec.dashboard_view_count, 0)::int AS "dashboardViewCount",
        COALESCE(ec.report_view_count, 0)::int AS "reportViewCount",
        COALESCE(ec.detail_view_count, 0)::int AS "detailViewCount",
        COALESCE(ec.compare_view_count, 0)::int AS "compareViewCount",
        COALESCE(ec.search_count, 0)::int AS "searchCount",
        COALESCE(ec.report_load_count, 0)::int AS "reportLoadCount",
        COALESCE(ec.saved_item_create_count, 0)::int AS "savedItemCreateCount",
        COALESCE(ec.saved_item_reopen_count, 0)::int AS "savedItemReopenCount",
        COALESCE(ec.compare_selection_count, 0)::int AS "compareSelectionCount",
        COALESCE(ec.account_return_count, 0)::int AS "accountReturnCount",
        COALESCE(ec.onboarding_help_count, 0)::int AS "onboardingHelpCount",
        ol.status AS "onboardingStatus",
        ol.updated_at AS "onboardingUpdatedAt"
      FROM app_users u
      LEFT JOIN saved_counts sc ON sc.user_id = u.id
      LEFT JOIN session_counts ac ON ac.user_id = u.id
      LEFT JOIN event_counts ec ON ec.user_id = u.id
      LEFT JOIN onboarding_latest ol ON ol.user_id = u.id
      ORDER BY u.created_at DESC, u.id DESC
    `

    return { configured: true, summary, users }
  } finally {
    await sql.end()
  }
}

export async function createManagedAccount(input: {
  email: string
  displayName: string
  password: string
  role: 'user' | 'admin'
  accountType: 'free' | 'paid'
  trialDays: number
  emailVerified: boolean
  acceptedTerms: boolean
  acknowledgedDisclaimer: boolean
}) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const email = normalizeEmail(input.email)
  const displayName = input.displayName.trim()
  const password = input.password
  if (!email || !email.includes('@')) throw new Error('Enter a valid email address')
  if (displayName.length < 2) throw new Error('Enter a display name')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  if (!['user', 'admin'].includes(input.role)) throw new Error('Choose a valid role')
  if (!['free', 'paid'].includes(input.accountType)) throw new Error('Choose a valid account type')
  if (!input.acceptedTerms) throw new Error('Terms and privacy consent must be confirmed')
  if (!input.acknowledgedDisclaimer) throw new Error('Legal disclaimer acknowledgement is required')
  const verifiedAt = input.emailVerified ? new Date() : null
  const trialDays = Number.isFinite(input.trialDays) ? Math.max(0, Math.floor(input.trialDays)) : 7
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)

  const sql = getSql()
  try {
    await sql`
      INSERT INTO app_users (
        email,
        display_name,
        password_hash,
        role,
        account_type,
        trial_ends_at,
        email_verified_at,
        terms_accepted_at,
        privacy_accepted_at,
        legal_disclaimer_acknowledged_at
      )
      VALUES (
        ${email},
        ${displayName},
        ${hashPassword(password)},
        ${input.role},
        ${input.accountType},
        ${trialEndsAt},
        ${verifiedAt},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `
  } finally {
    await sql.end()
  }
}

export async function updateManagedAccount(input: {
  userId: number
  currentAdminUserId: number
  email: string
  displayName: string
  role: 'user' | 'admin'
  accountType: 'free' | 'paid'
  trialEndsAt: string
  emailVerified: boolean
}) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const email = normalizeEmail(input.email)
  const displayName = input.displayName.trim()
  if (!input.userId) throw new Error('Missing account id')
  if (!email || !email.includes('@')) throw new Error('Enter a valid email address')
  if (displayName.length < 2) throw new Error('Enter a display name')
  if (!['user', 'admin'].includes(input.role)) throw new Error('Choose a valid role')
  if (!['free', 'paid'].includes(input.accountType)) throw new Error('Choose a valid account type')
  const trialEndsAt = new Date(input.trialEndsAt)
  if (Number.isNaN(trialEndsAt.getTime())) throw new Error('Enter a valid trial end date')

  const sql = getSql()
  try {
    if (input.userId === input.currentAdminUserId && input.role !== 'admin') {
      throw new Error('You cannot remove your own admin access')
    }

    if (input.role !== 'admin') {
      const [admins] = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin'
      `
      const [target] = await sql<{ role: 'user' | 'admin' }[]>`
        SELECT role FROM app_users WHERE id = ${input.userId} LIMIT 1
      `
      if (target?.role === 'admin' && admins.count <= 1) {
        throw new Error('At least one admin account must remain')
      }
    }

    await sql`
      UPDATE app_users
      SET
        email = ${email},
        display_name = ${displayName},
        role = ${input.role},
        account_type = ${input.accountType},
        trial_ends_at = ${trialEndsAt},
        email_verified_at = CASE
          WHEN ${input.emailVerified} THEN COALESCE(email_verified_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.userId}
    `
  } finally {
    await sql.end()
  }
}

export async function updateManagedAccountPassword(input: {
  userId: number
  password: string
}) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  if (!input.userId) throw new Error('Missing account id')
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters')

  const sql = getSql()
  try {
    // Invalidate existing sessions so a compromised or shared account doesn't
    // stay signed in past a deliberate password change — same rationale as a
    // self-service password reset.
    await sql.begin(async (transaction) => {
      await transaction`
        UPDATE app_users
        SET password_hash = ${hashPassword(input.password)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${input.userId}
      `
      await transaction`DELETE FROM app_sessions WHERE user_id = ${input.userId}`
    })
  } finally {
    await sql.end()
  }
}

export async function deleteManagedAccount(input: {
  userId: number
  currentAdminUserId: number
}) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  if (!input.userId) throw new Error('Missing account id')
  if (input.userId === input.currentAdminUserId) {
    throw new Error('You cannot delete your own account from the admin panel')
  }

  const sql = getSql()
  try {
    const [target] = await sql<{ role: 'user' | 'admin' }[]>`
      SELECT role FROM app_users WHERE id = ${input.userId} LIMIT 1
    `
    if (!target) throw new Error('Account not found')
    if (target.role === 'admin') {
      const [admins] = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin'
      `
      if (admins.count <= 1) {
        throw new Error('At least one admin account must remain')
      }
    }

    await sql`DELETE FROM app_users WHERE id = ${input.userId}`
  } finally {
    await sql.end()
  }
}
