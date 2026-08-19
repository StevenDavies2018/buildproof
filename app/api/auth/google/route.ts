import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.redirect(new URL('/account?error=Google%20OAuth%20is%20not%20configured', request.url))

  const state = randomBytes(24).toString('base64url')
  ;(await cookies()).set('backer-sonar-google-state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: new URL('/api/auth/callback/google', request.url).toString(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
