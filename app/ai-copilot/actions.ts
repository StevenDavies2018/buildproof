'use server'

import { generateCoPilotBrief, generateProductConceptBrief } from '@/lib/ai-copilot'
import { recordAnalyticsEvent } from '@/lib/analytics'
import { requireAiCopilotAccess } from '@/lib/auth'

export async function researchProductIdea(idea: string, excludeTermsInput: string) {
  const user = await requireAiCopilotAccess()
  const excludeTerms = excludeTermsInput
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean)

  try {
    const brief = await generateProductConceptBrief(idea, excludeTerms)
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: 'ai_copilot_product_research_run',
      surface: 'ai-copilot',
      metadata: { totalMatches: brief.result.totalMatches },
    })
    return { ok: true as const, ...brief }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unable to research this idea',
    }
  }
}

export async function generateBrief(itemKey: string) {
  const user = await requireAiCopilotAccess()

  try {
    const brief = await generateCoPilotBrief(user.id, itemKey)
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: 'ai_copilot_brief_generated',
      surface: 'ai-copilot',
      metadata: { itemType: brief.sourceItemType },
    })
    return { ok: true as const, ...brief }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unable to generate a brief for this item',
    }
  }
}
