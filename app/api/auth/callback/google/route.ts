import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signInWithGoogle } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('backer-sonar-google-state')?.value
  cookieStore.delete('backer-sonar-google-state')

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/account?error=Google%20sign-in%20was%20cancelled%20or%20expired', request.url))
  }

  try {
    const redirectUri = new URL('/api/auth/callback/google', request.url).toString()
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok) throw new Error('Google token exchange failed')
    const token = await tokenResponse.json() as { access_token?: string }
    if (!token.access_token) throw new Error('Google did not return an access token')

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (!profileResponse.ok) throw new Error('Google profile lookup failed')
    const profile = await profileResponse.json() as { sub?: string; email?: string; name?: string; email_verified?: boolean }
    if (!profile.sub || !profile.email || profile.email_verified === false) throw new Error('Google account email is unavailable or unverified')

    await signInWithGoogle(profile.sub, profile.email, profile.name ?? profile.email)
    return NextResponse.redirect(new URL('/dashboard?account=signed-in', request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sign-in failed'
    return NextResponse.redirect(new URL(`/account?error=${encodeURIComponent(message)}`, request.url))
  }
}
