'use server'

import { redirect } from 'next/navigation'
import { createAccount, signIn, signOut } from '@/lib/auth'

function message(value: unknown) {
  return encodeURIComponent(value instanceof Error ? value.message : 'Unable to complete that request')
}

export async function registerAccount(formData: FormData) {
  try {
    await createAccount(
      String(formData.get('email') ?? ''),
      String(formData.get('displayName') ?? ''),
      String(formData.get('password') ?? ''),
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

export async function logoutAccount() {
  await signOut()
  redirect('/?account=signed-out')
}
