import { NextResponse } from 'next/server'
import { getSql, hasDatabaseConfig } from '@/lib/db'

// Uptime monitors hit this on a schedule, so it must never be cached or
// treated as a static route — always run the real check.
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ status: 'error', database: 'unconfigured' }, { status: 503 })
  }

  const sql = getSql()

  try {
    await sql`SELECT 1`
    return NextResponse.json({ status: 'ok', database: 'up' })
  } catch (error) {
    console.error('Health check database ping failed', error)
    return NextResponse.json({ status: 'error', database: 'down' }, { status: 503 })
  }
}
