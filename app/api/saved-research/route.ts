import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSql, hasDatabaseConfig } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !hasDatabaseConfig()) return NextResponse.json({ authenticated: false, items: [] })

  const rows = await getSql()`
    SELECT
      item_key AS "itemKey", item_type AS "itemType", label, href,
      payload_json AS payload, snapshot_version AS "snapshotVersion",
      note, saved_at AS "savedAt"
    FROM saved_research_items
    WHERE user_id = ${user.id}
    ORDER BY saved_at DESC
  `
  return NextResponse.json({ authenticated: true, items: rows })
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

  await getSql()`
    INSERT INTO saved_research_items (user_id, item_key, item_type, label, href, payload_json, snapshot_version, note)
    VALUES (${user.id}, ${body.id}, ${body.type}, ${body.label}, ${body.href}, ${JSON.stringify(body.payload ?? {})}::jsonb, ${body.snapshotVersion}, ${body.note ?? null})
    ON CONFLICT (user_id, item_key) DO UPDATE SET
      label = EXCLUDED.label,
      href = EXCLUDED.href,
      payload_json = EXCLUDED.payload_json,
      snapshot_version = EXCLUDED.snapshot_version,
      note = EXCLUDED.note,
      saved_at = CURRENT_TIMESTAMP
  `
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
  return NextResponse.json({ ok: true })
}
