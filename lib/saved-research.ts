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

export function researchViewIdentity(filters: Record<string, string>) {
  return `research:${stableHash(JSON.stringify(normalizedEntries(filters)))}`
}

export function researchViewHref(filters: Record<string, string>) {
  const params = new URLSearchParams(normalizedEntries(filters))
  const query = params.toString()
  return query ? `/?${query}` : '/'
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
