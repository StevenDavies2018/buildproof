export type OnboardingStatus = 'not_started' | 'skipped' | 'completed'
export const ONBOARDING_WALKTHROUGH_KEY = 'user-view-v1'
export type OnboardingVariant = 'dashboard' | 'reports'

export type OnboardingStep = {
  id: string
  title: string
  body: string
  bullets: string[]
  note?: string
  primaryLabel: string
  targetId?: string
}

export const ONBOARDING_VARIANT_LABELS: Record<OnboardingVariant, string> = {
  dashboard: 'User View walkthrough',
  reports: 'Reporting walkthrough',
}

export const ONBOARDING_STATUS_CHANGED_EVENT = 'backer-sonar:onboarding-status-changed'
export const ONBOARDING_OPEN_EVENT = 'backer-sonar:open-onboarding'
export const ONBOARDING_SAMPLE_QUERY: Record<string, string> = {
  view: 'campaigns',
  search: '5e monster bestiary book',
  categoryParent: 'Games',
  categorySlug: 'games/tabletop games',
  rawState: 'successful',
  durationBucket: 'medium',
  minGoal: '10000',
  sortBy: 'recommended',
  sortDir: 'desc',
  cardLimit: '12',
  cardOffset: '0',
  onboardingSample: '1',
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Find comparable Kickstarter campaigns before you build',
    body:
      'Backer Sonar helps you test a product idea against real Kickstarter history. In a few quick steps, you will shape a market slice, read the signal, and open the campaign evidence behind it.',
    bullets: [
      'Describe the idea you want to evaluate',
      'Narrow the market with filters',
      'Inspect comparable campaigns and supporting evidence',
    ],
    primaryLabel: 'Start walkthrough',
    targetId: 'onboarding-target-saved-research',
  },
  {
    id: 'shape-slice',
    title: 'Shape the market slice',
    body:
      'These filters decide which historical campaigns count as comparable. Start broad, then narrow only when a filter improves the comparison.',
    bullets: [
      'Research idea describes what you may want to launch',
      'Main category and Subcategory define the Kickstarter area to inspect',
      'Product taxonomy narrows the product type inside that category',
      'State, Goal, Pledged, and Duration help remove weak comparisons',
    ],
    note: 'Your filters stay visible so you always know what market slice is being shown.',
    primaryLabel: 'Next: read the signal',
    targetId: 'onboarding-target-filters',
  },
  {
    id: 'read-signal',
    title: 'Read the answer first',
    body:
      'These cards summarize the current slice before you inspect individual campaigns. Use them to decide whether this market is worth deeper review.',
    bullets: [
      'Comparable campaigns shows how many campaigns match this slice',
      'Success rate shows how often completed campaigns in this slice funded',
      'Research coverage shows how much of the slice has enough evidence to inspect directly',
      'Money comparability shows whether cross-currency money comparisons are trustworthy',
    ],
    note: 'These are decision signals, not guarantees. Small samples and incomplete money normalization should be treated as directional, not definitive.',
    primaryLabel: 'Next: inspect campaign evidence',
    targetId: 'onboarding-target-signal',
  },
  {
    id: 'campaign-evidence',
    title: 'Open the evidence behind the signal',
    body:
      'Each campaign card is a historical example inside the current slice. The card should explain why it matched and whether the evidence is strong enough to inspect further.',
    bullets: [
      'Why this matched explains the deterministic reasons the campaign appeared',
      'Status, Goal, Pledged, Backers, and Duration show the core campaign facts',
      'Native money and USD-normalized money should be read together when currencies differ',
      'Open detail, Select for compare, and Save campaign move the research forward',
    ],
    note: 'Match strength explains relevance to your idea. It is not a quality score and it is not a prediction of success.',
    primaryLabel: 'Next: what to do after this',
    targetId: 'onboarding-target-campaign-card',
  },
  {
    id: 'next-actions',
    title: 'Choose the next level of review',
    body:
      'Once a slice looks promising, the next step depends on what you need to learn. Backer Sonar gives you clear ways to go deeper without losing your work.',
    bullets: [
      'Open detail to inspect one campaign deeply',
      'Open Reporting to review category and year patterns',
      'Select for compare to study 2 to 4 campaigns side by side',
      'Save this research view to reopen the same slice later',
    ],
    note: 'You can save and reopen three kinds of work: research views, individual campaigns, and saved comparison sets.',
    primaryLabel: 'Finish walkthrough',
    targetId: 'onboarding-target-campaigns',
  },
]

export function getOnboardingStorageKey(userId: number) {
  return `backer-sonar-onboarding-v1:${userId}`
}

export async function loadAccountOnboardingStatus() {
  const response = await fetch('/api/onboarding', { cache: 'no-store' })
  if (!response.ok) {
    return { authenticated: false, status: 'not_started' as OnboardingStatus }
  }

  const data = (await response.json()) as {
    authenticated?: boolean
    status?: OnboardingStatus
  }

  return {
    authenticated: data.authenticated === true,
    status:
      data.status === 'completed' || data.status === 'skipped'
        ? data.status
        : ('not_started' as OnboardingStatus),
  }
}

export async function saveAccountOnboardingStatus(status: OnboardingStatus, lastCompletedStep?: string) {
  await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, lastCompletedStep }),
  })
}
