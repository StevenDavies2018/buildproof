export const SAVED_RESEARCH_STORAGE_KEY = 'backer-sonar-saved-research-v1'
export const SAVED_RESEARCH_CHANGED_EVENT = 'backer-sonar:saved-research-changed'

type SavedBase = {
  id: string
  label: string
  savedAt: string
  snapshotVersion: string
  note?: string
}

export type SavedResearchView = SavedBase & {
  type: 'research'
  href: string
  filters: Record<string, string>
}

export type SavedCampaign = SavedBase & {
  type: 'campaign'
  campaignId: number
  href: string
  categoryLabel: string | null
  projectUrl: string | null
}

export type SavedComparison = SavedBase & {
  type: 'comparison'
  campaignIds: number[]
  href: string
  categoryLabel: string | null
}

export type SavedResearchItem = SavedResearchView | SavedCampaign | SavedComparison

export type SaveLimits = {
  research: number | null
  campaign: number | null
  comparison: number | null
}

export type SavedResearchState = {
  authenticated: boolean
  items: SavedResearchItem[]
  limits: SaveLimits
  canUseAiCopilot: boolean
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function normalizedEntries(filters: Record<string, string>) {
  return Object.entries(filters)
    .filter(([, value]) => value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
}

export type ResearchViewSource = 'dashboard' | 'reports' | 'reports-structure'

const RESEARCH_VIEW_BASE_PATH: Record<ResearchViewSource, string> = {
  dashboard: '/dashboard',
  reports: '/reports',
  'reports-structure': '/reports/structure',
}

// Same filter values saved from Dashboard vs. Reporting vs. the goal/duration
// structure view should not collide on one identity — the source is folded
// into the hash so each gets its own saved entry even if the filter values
// happen to match.
export function researchViewIdentity(filters: Record<string, string>, source: ResearchViewSource = 'dashboard') {
  return `research:${source}:${stableHash(JSON.stringify(normalizedEntries(filters)))}`
}

export function researchViewHref(filters: Record<string, string>, source: ResearchViewSource = 'dashboard') {
  const basePath = RESEARCH_VIEW_BASE_PATH[source]
  const params = new URLSearchParams(normalizedEntries(filters))
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function comparisonIdentity(campaignIds: number[]) {
  return `comparison:${[...campaignIds].sort((left, right) => left - right).join('-')}`
}

export function readSavedResearch() {
  if (typeof window === 'undefined') return [] as SavedResearchItem[]

  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_RESEARCH_STORAGE_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter(
          (item): item is SavedResearchItem =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            ['research', 'campaign', 'comparison'].includes(item.type),
        )
      : []
  } catch {
    return []
  }
}

function writeSavedResearch(items: SavedResearchItem[]) {
  window.localStorage.setItem(SAVED_RESEARCH_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(SAVED_RESEARCH_CHANGED_EVENT))
}

export function saveResearchItem(item: SavedResearchItem) {
  const items = readSavedResearch().filter((existing) => existing.id !== item.id)
  writeSavedResearch([item, ...items])
}

export function removeResearchItem(id: string) {
  writeSavedResearch(readSavedResearch().filter((item) => item.id !== id))
}

export function subscribeToSavedResearch(listener: () => void) {
  window.addEventListener(SAVED_RESEARCH_CHANGED_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(SAVED_RESEARCH_CHANGED_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

export async function loadAccountSavedResearch() {
  const response = await fetch('/api/saved-research', { cache: 'no-store' })
  if (!response.ok) {
    return {
      authenticated: false,
      items: [] as SavedResearchItem[],
      limits: { research: null, campaign: null, comparison: null },
      canUseAiCopilot: false,
    }
  }
  const data = await response.json() as {
    authenticated?: boolean
    limits?: SaveLimits
    canUseAiCopilot?: boolean
    items?: Array<SavedResearchItem & { itemKey?: string; itemType?: SavedResearchItem['type']; payload?: Record<string, unknown> }>
  }
  const items = (data.items ?? []).map((item) => ({
    ...item.payload,
    id: item.itemKey ?? item.id,
    type: item.itemType ?? item.type,
    label: item.label,
    href: item.href,
    savedAt: item.savedAt,
    snapshotVersion: item.snapshotVersion,
  })) as SavedResearchItem[]
  return {
    authenticated: data.authenticated === true,
    items,
    limits: data.limits ?? { research: null, campaign: null, comparison: null },
    canUseAiCopilot: data.canUseAiCopilot === true,
  }
}

export async function saveAccountResearchItem(item: SavedResearchItem) {
  const response = await fetch('/api/saved-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: item.id,
      type: item.type,
      label: item.label,
      href: item.href,
      snapshotVersion: item.snapshotVersion,
      note: item.note,
      payload: item,
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unable to save this item' }))
    throw new Error(typeof data.error === 'string' ? data.error : 'Unable to save this item')
  }
}

export async function removeAccountResearchItem(id: string) {
  await fetch('/api/saved-research', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}
