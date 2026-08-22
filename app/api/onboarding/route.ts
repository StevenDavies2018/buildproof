import { NextResponse } from 'next/server'
import { recordAnalyticsEvent } from '@/lib/analytics'
import { getCurrentUser } from '@/lib/auth'
import { getSql, hasDatabaseConfig } from '@/lib/db'
import { ONBOARDING_WALKTHROUGH_KEY, type OnboardingStatus } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !hasDatabaseConfig()) {
    return NextResponse.json({ authenticated: false, status: 'not_started' })
  }

  try {
    const [row] = await getSql()<{
      status: OnboardingStatus
    }[]>`
      SELECT status
      FROM user_onboarding_states
      WHERE user_id = ${user.id} AND walkthrough_key = ${ONBOARDING_WALKTHROUGH_KEY}
      LIMIT 1
    `

    return NextResponse.json({
      authenticated: true,
      status:
        row?.status === 'completed' || row?.status === 'skipped'
          ? row.status
          : 'not_started',
    })
  } catch {
    return NextResponse.json({ authenticated: true, status: 'not_started' })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const body = (await request.json()) as {
    status?: OnboardingStatus
    lastCompletedStep?: string
  }

  const status =
    body.status === 'completed' || body.status === 'skipped' || body.status === 'not_started'
      ? body.status
      : null

  if (!status) {
    return NextResponse.json({ error: 'Valid onboarding status is required' }, { status: 400 })
  }

  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const skippedAt = status === 'skipped' ? new Date().toISOString() : null

  try {
    await getSql()`
      INSERT INTO user_onboarding_states (
        user_id, walkthrough_key, status, last_completed_step, completed_at, skipped_at, updated_at
      )
      VALUES (
        ${user.id},
        ${ONBOARDING_WALKTHROUGH_KEY},
        ${status},
        ${body.lastCompletedStep ?? null},
        ${completedAt},
        ${skippedAt},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, walkthrough_key) DO UPDATE SET
        status = EXCLUDED.status,
        last_completed_step = EXCLUDED.last_completed_step,
        completed_at = CASE
          WHEN EXCLUDED.status = 'completed' THEN EXCLUDED.completed_at
          ELSE user_onboarding_states.completed_at
        END,
        skipped_at = CASE
          WHEN EXCLUDED.status = 'skipped' THEN EXCLUDED.skipped_at
          ELSE user_onboarding_states.skipped_at
        END,
        updated_at = CURRENT_TIMESTAMP
    `
  } catch {
    return NextResponse.json({ ok: false, fallback: true })
  }

  if (status === 'completed' || status === 'skipped') {
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: status === 'completed' ? 'onboarding_completed' : 'onboarding_skipped',
      surface: 'onboarding',
    })
  }

  return NextResponse.json({ ok: true })
}
