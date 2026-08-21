'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const GOOGLE_CONSENT_COOKIE = 'backer-sonar-google-registration-consent'

function message(value: unknown) {
  return encodeURIComponent(value instanceof Error ? value.message : 'Unable to continue with Google registration')
}

export async function beginGoogleRegistration(formData: FormData) {
  try {
    const acceptedTerms = formData.get('acceptTerms') === 'on'
    const acknowledgedDisclaimer = formData.get('acknowledgeDisclaimer') === 'on'

    if (!acceptedTerms) {
      throw new Error('You must agree to the Terms of use and Privacy policy before registering with Google.')
    }

    if (!acknowledgedDisclaimer) {
      throw new Error('You must acknowledge the legal disclaimer before registering with Google.')
    }

    const grantedAt = new Date().toISOString()
    ;(await cookies()).set(
      GOOGLE_CONSENT_COOKIE,
      JSON.stringify({
        grantedAt,
        acceptedTerms: true,
        acknowledgedDisclaimer: true,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60,
        path: '/',
      },
    )
  } catch (error) {
    redirect(`/account/google-consent?error=${message(error)}`)
  }

  redirect('/api/auth/google?intent=register')
}
