'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  comparisonIdentity,
  readSavedResearch,
  removeResearchItem,
  researchViewHref,
  researchViewIdentity,
  saveResearchItem,
  subscribeToSavedResearch,
  type SavedResearchItem,
} from '@/lib/saved-research'

const SNAPSHOT_VERSION = '2026-08-12'

function useSavedItems() {
  const [items, setItems] = useState<SavedResearchItem[]>([])

  useEffect(() => {
    const refresh = () => setItems(readSavedResearch())
    refresh()
    return subscribeToSavedResearch(refresh)
  }, [])

  return items
}

function SaveToggle({
  item,
  saveLabel,
  savedLabel,
  className = 'bs-button-secondary',
}: {
  item: SavedResearchItem
  saveLabel: string
  savedLabel: string
  className?: string
}) {
  const items = useSavedItems()
  const isSaved = items.some((existing) => existing.id === item.id)

  return (
    <button
      type="button"
      className={isSaved ? 'bs-button-primary' : className}
      aria-pressed={isSaved}
      onClick={() => (isSaved ? removeResearchItem(item.id) : saveResearchItem(item))}
    >
      {isSaved ? savedLabel : saveLabel}
    </button>
  )
}

export function SaveResearchViewButton({
  filters,
  label,
  className,
}: {
  filters: Record<string, string>
  label: string
  className?: string
}) {
  const item = {
    id: researchViewIdentity(filters),
    type: 'research' as const,
    label,
    savedAt: new Date().toISOString(),
    snapshotVersion: SNAPSHOT_VERSION,
    filters,
    href: researchViewHref(filters),
  }
  return <SaveToggle item={item} saveLabel="Save this research" savedLabel="Research saved" className={className} />
}

export function SaveCampaignButton({
  campaignId,
  projectName,
  categoryLabel,
  projectUrl,
}: {
  campaignId: number
  projectName: string
  categoryLabel: string | null
  projectUrl: string | null
}) {
  return (
    <SaveToggle
      item={{
        id: `campaign:${campaignId}`,
        type: 'campaign',
        campaignId,
        label: projectName,
        categoryLabel,
        projectUrl,
        href: `/campaigns/${campaignId}`,
        savedAt: new Date().toISOString(),
        snapshotVersion: SNAPSHOT_VERSION,
      }}
      saveLabel="Save campaign"
      savedLabel="Campaign saved"
    />
  )
}

export function SaveComparisonButton({
  campaignIds,
  campaignNames,
  categoryLabel,
}: {
  campaignIds: number[]
  campaignNames: string[]
  categoryLabel: string | null
}) {
  const sortedIds = [...campaignIds].sort((left, right) => left - right)
  return (
    <SaveToggle
      item={{
        id: comparisonIdentity(sortedIds),
        type: 'comparison',
        campaignIds: sortedIds,
        label: campaignNames.slice(0, 2).join(' vs '),
        categoryLabel,
        href: `/compare?ids=${sortedIds.join(',')}`,
        savedAt: new Date().toISOString(),
        snapshotVersion: SNAPSHOT_VERSION,
      }}
      saveLabel="Save comparison"
      savedLabel="Comparison saved"
    />
  )
}

function SavedItemsContent({ items, onClose }: { items: SavedResearchItem[]; onClose?: () => void }) {
  const groups = [
    { type: 'research', label: 'Research views' },
    { type: 'campaign', label: 'Campaigns' },
    { type: 'comparison', label: 'Comparisons' },
  ] as const

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="bs-kicker">Saved research</p>
          <h2 className="bs-title mt-2 text-xl font-semibold">Your working set</h2>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="bs-button-secondary px-3 py-1.5">Close</button>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Stored in this browser until accounts are introduced.
      </p>
      <div className="mt-5 grid gap-5">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.type === group.type)
          return (
            <section key={group.type}>
              <div className="flex items-center justify-between gap-3">
                <p className="bs-kicker">{group.label}</p>
                <span className="bs-data-chip bg-slate-900 text-white">{groupItems.length}</span>
              </div>
              <div className="mt-2 grid gap-2">
                {groupItems.length ? groupItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-bs-border bg-[color:var(--bs-field-bg)] p-3">
                    <Link href={item.href} onClick={onClose} className="block text-sm font-medium text-slate-900 hover:underline">
                      {item.label}
                    </Link>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">Snapshot {item.snapshotVersion}</span>
                      <button type="button" onClick={() => removeResearchItem(item.id)} className="text-xs text-slate-500 underline underline-offset-4">
                        Remove
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-xl border border-dashed border-bs-border p-3 text-xs leading-5 text-slate-500">
                    Nothing saved yet.
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

export function SavedResearchPanel() {
  const items = useSavedItems()
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside className="sticky top-28 hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.75rem] border border-bs-border bg-[color:var(--bs-panel)] p-5 shadow-[0_16px_40px_rgba(2,6,23,0.14)] xl:block">
        <SavedItemsContent items={items} />
      </aside>
      <button type="button" onClick={() => setOpen(true)} className="bs-button-primary fixed bottom-5 right-5 z-40 shadow-xl xl:hidden">
        Saved ({items.length})
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-4 backdrop-blur-sm xl:hidden" onClick={() => setOpen(false)}>
          <aside className="ml-auto h-full w-full max-w-sm overflow-y-auto rounded-[1.75rem] border border-bs-border bg-[color:var(--bs-panel)] p-5" onClick={(event) => event.stopPropagation()}>
            <SavedItemsContent items={items} onClose={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  )
}
