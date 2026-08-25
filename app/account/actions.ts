'use server'

import { redirect } from 'next/navigation'
import { createBillingPortalSession, createSubscriptionCheckoutSession, syncSubscriptionFromStripe } from '@/lib/billing'
import { recordAnalyticsEvent } from '@/lib/analytics'
import {
  createAccount,
  getUserEntitlements,
  requireSignedInUser,
  resendVerificationEmail,
  setAiCopilotEnabled,
  signIn,
  signOut,
} from '@/lib/auth'

function message(value: unknown) {
  return encodeURIComponent(value instanceof Error ? value.message : 'Unable to complete that request')
}

export async function registerAccount(formData: FormData) {
  try {
    const acceptedTerms = formData.get('acceptTerms') === 'on'
    const acknowledgedDisclaimer = formData.get('acknowledgeDisclaimer') === 'on'

    if (!acceptedTerms) {
      throw new Error('You must agree to the Terms of use and Privacy policy before creating an account.')
    }

    if (!acknowledgedDisclaimer) {
      throw new Error('You must acknowledge the legal disclaimer before creating an account.')
    }

    await createAccount(
      String(formData.get('email') ?? ''),
      String(formData.get('displayName') ?? ''),
      String(formData.get('password') ?? ''),
      {
        acceptedTerms,
        acknowledgedDisclaimer,
      },
    )
  } catch (error) {
    redirect(`/account?error=${message(error)}`)
  }
  redirect('/account?pending=verification')
}

export async function loginAccount(formData: FormData) {
  try {
    await signIn(String(formData.get('email') ?? ''), String(formData.get('password') ?? ''))
  } catch (error) {
    redirect(`/account?error=${message(error)}`)
  }
  redirect('/dashboard?account=signed-in')
}

export async function resendVerificationEmailAction(formData: FormData) {
  try {
    await resendVerificationEmail(String(formData.get('email') ?? ''))
  } catch (error) {
    redirect(`/account?error=${message(error)}`)
  }
  redirect('/account?pending=verification-resent')
}

export async function logoutAccount() {
  await signOut()
  redirect('/?account=signed-out')
}

export async function startUpgradeCheckout() {
  const user = await requireSignedInUser()
  let url: string
  try {
    url = await createSubscriptionCheckoutSession({ id: user.id, email: user.email })
  } catch (error) {
    redirect(`/account?error=${message(error)}`)
  }
  redirect(url)
}

export async function openBillingPortal() {
  const user = await requireSignedInUser()
  let url: string
  try {
    url = await createBillingPortalSession({ id: user.id, email: user.email })
  } catch (error) {
    redirect(`/account?error=${message(error)}`)
  }
  redirect(url)
}

export async function syncBillingStatus() {
  const user = await requireSignedInUser()
  try {
    await syncSubscriptionFromStripe(user.id)
  } catch (error) {
    redirect(`/account?error=${message(error)}`)
  }
  redirect('/account?checkout=synced')
}

export async function enableAiCopilot(formData: FormData) {
  const user = await requireSignedInUser()
  const entitlements = getUserEntitlements(user)
  if (!entitlements.canUseAiCopilot) {
    redirect('/account?error=AI%20Co-Pilot%20is%20included%20in%20the%20Paid%20plan')
  }
  if (formData.get('acknowledge') !== 'on') {
    redirect('/account?error=You%20must%20acknowledge%20how%20AI%20Co-Pilot%20works%20before%20enabling%20it')
  }

  await setAiCopilotEnabled(user.id, true)
  await recordAnalyticsEvent({ userId: user.id, eventName: 'ai_copilot_enabled', surface: 'account' })
  redirect('/account?checkout=copilot-enabled')
}

export async function disableAiCopilot() {
  const user = await requireSignedInUser()
  await setAiCopilotEnabled(user.id, false)
  await recordAnalyticsEvent({ userId: user.id, eventName: 'ai_copilot_disabled', surface: 'account' })
  redirect('/account?checkout=copilot-disabled')
}
