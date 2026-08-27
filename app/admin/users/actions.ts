'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import {
  createManagedAccount,
  deleteManagedAccount,
  updateManagedAccount,
  updateManagedAccountPassword,
} from '@/lib/admin-users'

function message(value: unknown) {
  return encodeURIComponent(value instanceof Error ? value.message : 'Unable to update accounts')
}

export async function createManagedAccountAction(formData: FormData) {
  const admin = await requireAdmin()
  const adminEmail = admin?.email ?? 'admin'
  try {
    await createManagedAccount({
      email: String(formData.get('email') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      password: String(formData.get('password') ?? ''),
      role: String(formData.get('role') ?? 'user') === 'admin' ? 'admin' : 'user',
      accountType: String(formData.get('accountType') ?? 'free') === 'paid' ? 'paid' : 'free',
      trialDays: Number(formData.get('trialDays') ?? '7'),
      emailVerified: formData.get('emailVerified') === 'on',
      acceptedTerms: formData.get('acceptTerms') === 'on',
      acknowledgedDisclaimer: formData.get('acknowledgeDisclaimer') === 'on',
    })
  } catch (error) {
    redirect(`/admin/users?error=${message(error)}`)
  }

  revalidatePath('/admin/users')
  redirect(`/admin/users?success=${encodeURIComponent(`Created account from admin ${adminEmail}`)}`)
}

export async function updateManagedAccountAction(formData: FormData) {
  const admin = await requireAdmin()
  const adminUserId = admin?.id ?? 0
  try {
    await updateManagedAccount({
      userId: Number(formData.get('userId')),
      currentAdminUserId: adminUserId,
      email: String(formData.get('email') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      role: String(formData.get('role') ?? 'user') === 'admin' ? 'admin' : 'user',
      accountType: String(formData.get('accountType') ?? 'free') === 'paid' ? 'paid' : 'free',
      trialEndsAt: String(formData.get('trialEndsAt') ?? ''),
      emailVerified: formData.get('emailVerified') === 'on',
    })
  } catch (error) {
    redirect(`/admin/users?error=${message(error)}`)
  }

  revalidatePath('/admin/users')
  redirect('/admin/users?success=Account%20updated')
}

export async function updateManagedAccountPasswordAction(formData: FormData) {
  await requireAdmin()
  try {
    await updateManagedAccountPassword({
      userId: Number(formData.get('userId')),
      password: String(formData.get('password') ?? ''),
    })
  } catch (error) {
    redirect(`/admin/users?error=${message(error)}`)
  }

  revalidatePath('/admin/users')
  redirect('/admin/users?success=Password%20updated.%20That%20account%27s%20sessions%20were%20signed%20out.')
}

export async function deleteManagedAccountAction(formData: FormData) {
  const admin = await requireAdmin()
  const adminUserId = admin?.id ?? 0
  try {
    await deleteManagedAccount({
      userId: Number(formData.get('userId')),
      currentAdminUserId: adminUserId,
    })
  } catch (error) {
    redirect(`/admin/users?error=${message(error)}`)
  }

  revalidatePath('/admin/users')
  redirect('/admin/users?success=Account%20deleted')
}
