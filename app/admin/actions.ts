'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSql } from '@/lib/db'

export async function updateSubsetMembershipAction(formData: FormData) {
  const campaignId = Number(formData.get('campaignId'))
  const subsetKey = String(formData.get('subsetKey') ?? '')
  const subsetVersion = String(formData.get('subsetVersion') ?? '')
  const membershipStatus = String(formData.get('membershipStatus') ?? '')
  const confidenceLabel = String(formData.get('confidenceLabel') ?? '')
  const returnTo = String(formData.get('returnTo') ?? '/admin')

  if (!campaignId || !subsetKey || !subsetVersion || !membershipStatus) {
    throw new Error('Missing subset membership update fields')
  }

  const sql = getSql()

  try {
    await sql`
      UPDATE subset_memberships
      SET
        membership_status = ${membershipStatus},
        confidence_label = ${confidenceLabel || null},
        reason_json = jsonb_set(
          COALESCE(reason_json, '{}'::jsonb),
          '{lastUpdatedFrom}',
          '"admin-ui"'::jsonb,
          true
        )
      WHERE campaign_id = ${campaignId}
        AND subset_key = ${subsetKey}
        AND subset_version = ${subsetVersion}
    `
  } finally {
    await sql.end()
  }

  revalidatePath('/admin')
  redirect(returnTo || '/admin')
}
