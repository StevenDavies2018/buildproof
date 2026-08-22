import { NextResponse } from 'next/server'
import { recordAnalyticsEvent } from '@/lib/analytics'
import { getCurrentUser, getUserEntitlements } from '@/lib/auth'
import { getSql, hasDatabaseConfig } from '@/lib/db'

export const dynamic = 'force-dynamic'

const EMPTY_LIMITS = { research: null, campaign: null, comparison: null }

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !hasDatabaseConfig()) {
    return NextResponse.json({
      authenticated: false,
      items: [],
      limits: EMPTY_LIMITS,
      canUseAiCopilot: false,
    })
  }

  const entitlements = getUserEntitlements(user)

  const rows = await getSql()`
    SELECT
      item_key AS "itemKey", item_type AS "itemType", label, href,
      payload_json AS payload, snapshot_version AS "snapshotVersion",
      note, saved_at AS "savedAt"
    FROM saved_research_items
    WHERE user_id = ${user.id}
    ORDER BY saved_at DESC
  `
  return NextResponse.json({
    authenticated: true,
    items: rows,
    limits: entitlements.saveLimits,
    canUseAiCopilot: entitlements.canUseAiCopilot,
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const body = await request.json() as {
    id?: string
    type?: 'research' | 'campaign' | 'comparison'
    label?: string
    href?: string
    snapshotVersion?: string
    note?: string
    payload?: Record<string, unknown>
  }
  if (!body.id || !body.type || !body.label || !body.href || !body.snapshotVersion) {
    return NextResponse.json({ error: 'Incomplete saved item' }, { status: 400 })
  }

  const entitlements = getUserEntitlements(user)
  const limit = entitlements.saveLimits[body.type]
  // Pull these into their own consts (rather than reading body.* inside the
  // closure below) so TypeScript keeps the narrowing from the guard above —
  // narrowing on a captured object's properties doesn't survive into a
  // nested closure.
  const itemId = body.id
  const itemType = body.type
  const itemLabel = body.label
  const itemHref = body.href
  const snapshotVersion = body.snapshotVersion
  const note = body.note ?? null
  const payloadJson = JSON.stringify(body.payload ?? {})

  const sql = getSql()
  let limitReached = false
  try {
    await sql.begin(async (tx) => {
      // Serialize concurrent saves for this user so the count check below can't
      // race with another in-flight save and both slip past the limit.
      await tx`SELECT pg_advisory_xact_lock(${user.id})`

      const [existing] = await tx<{ exists: boolean }[]>`
        SELECT EXISTS(
          SELECT 1
          FROM saved_research_items
          WHERE user_id = ${user.id} AND item_key = ${itemId}
        ) AS "exists"
      `

      if (!existing?.exists && limit !== null) {
        const [{ count }] = await tx<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM saved_research_items
          WHERE user_id = ${user.id} AND item_type = ${itemType}
        `

        if (count >= limit) {
          limitReached = true
          return
        }
      }

      await tx`
        INSERT INTO saved_research_items (user_id, item_key, item_type, label, href, payload_json, snapshot_version, note)
        VALUES (${user.id}, ${itemId}, ${itemType}, ${itemLabel}, ${itemHref}, ${payloadJson}::jsonb, ${snapshotVersion}, ${note})
        ON CONFLICT (user_id, item_key) DO UPDATE SET
          label = EXCLUDED.label,
          href = EXCLUDED.href,
          payload_json = EXCLUDED.payload_json,
          snapshot_version = EXCLUDED.snapshot_version,
          note = EXCLUDED.note,
          saved_at = CURRENT_TIMESTAMP
      `
    })
  } finally {
    await sql.end()
  }

  if (limitReached) {
    const label =
      body.type === 'research'
        ? 'saved research views'
        : body.type === 'campaign'
          ? 'saved campaigns'
          : 'saved comparisons'
    return NextResponse.json(
      {
        error: `Trial limit reached: ${limit} ${label}. Upgrade to add more.`,
      },
      { status: 403 },
    )
  }

  await recordAnalyticsEvent({
    userId: user.id,
    eventName: 'saved_item_created',
    surface: 'saved-research',
    metadata: { itemType: body.type },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const body = await request.json() as { id?: string }
  if (!body.id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 })

  await getSql()`
    DELETE FROM saved_research_items WHERE user_id = ${user.id} AND item_key = ${body.id}
  `
  await recordAnalyticsEvent({
    userId: user.id,
    eventName: 'saved_item_deleted',
    surface: 'saved-research',
  })
  return NextResponse.json({ ok: true })
}
