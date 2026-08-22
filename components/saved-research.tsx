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
  loadAccountSavedResearch,
  removeAccountResearchItem,
  saveAccountResearchItem,
  subscribeToSavedResearch,
  type ResearchViewSource,
  type SaveLimits,
  type SavedResearchItem,
} from '@/lib/saved-research'
import { postAnalyticsEvent } from '@/lib/client-analytics'

const SNAPSHOT_VERSION = '2026-08-12'

function useSavedItems() {
  const [items, setItems] = useState<SavedResearchItem[]>([])
  const [authenticated, setAuthenticated] = useState(false)
  const [limits, setLimits] = useState<SaveLimits>({
    research: null,
    campaign: null,
    comparison: null,
  })
  const [canUseAiCopilot, setCanUseAiCopilot] = useState(false)

  useEffect(() => {
    const refresh = () => setItems(readSavedResearch())
    refresh()
    loadAccountSavedResearch().then((accountItems) => {
      setAuthenticated(accountItems.authenticated)
      setLimits(accountItems.limits)
      setCanUseAiCopilot(accountItems.canUseAiCopilot)
      if (accountItems.authenticated) setItems(accountItems.items)
    }).catch(() => undefined)
    return subscribeToSavedResearch(refresh)
  }, [])

  return { items, authenticated, limits, canUseAiCopilot }
}

function SaveToggle({
  item,
  saveLabel,
  savedLabel,
  className = 'bs-button-secondary',
  limitOverride = null,
}: {
  item: SavedResearchItem
  saveLabel: string
  savedLabel: string
  className?: string
  limitOverride?: SaveLimits | null
}) {
  const { items, authenticated, limits } = useSavedItems()
  const [error, setError] = useState<string | null>(null)
  const isSaved = items.some((existing) => existing.id === item.id)
  const effectiveLimits = limitOverride ?? limits
  const groupCount = items.filter((existing) => existing.type === item.type).length
  const limit = effectiveLimits[item.type]
  const atLimit = !isSaved && limit !== null && groupCount >= limit

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={isSaved ? 'bs-button-primary' : className}
        aria-pressed={isSaved}
        disabled={atLimit}
        onClick={async () => {
          setError(null)
          if (isSaved) {
            removeResearchItem(item.id)
            if (authenticated) void removeAccountResearchItem(item.id)
            return
          }

          if (atLimit) {
            setError(`Trial limit reached: ${limit} saved ${item.type === 'research' ? 'research views' : item.type === 'campaign' ? 'campaigns' : 'comparisons'}.`)
            return
          }

          saveResearchItem(item)
          if (authenticated) {
            try {
              await saveAccountResearchItem(item)
            } catch (saveError) {
              removeResearchItem(item.id)
              setError(saveError instanceof Error ? saveError.message : 'Unable to save this item.')
            }
          }
        }}
      >
        {atLimit ? `Limit reached (${limit})` : isSaved ? savedLabel : saveLabel}
      </button>
      {error ? <p className="text-xs leading-5 text-amber-700">{error}</p> : null}
    </div>
  )
}

export function SaveResearchViewButton({
  filters,
  label,
  className,
  entitlementLimits = null,
  source = 'dashboard',
}: {
  filters: Record<string, string>
  label: string
  className?: string
  entitlementLimits?: SaveLimits | null
  source?: ResearchViewSource
}) {
  const item = {
    id: researchViewIdentity(filters, source),
    type: 'research' as const,
    label,
    savedAt: new Date().toISOString(),
    snapshotVersion: SNAPSHOT_VERSION,
    filters,
    href: researchViewHref(filters, source),
  }
  return <SaveToggle item={item} saveLabel="Save this research" savedLabel="Research saved" className={className} limitOverride={entitlementLimits} />
}

export function SaveCampaignButton({
  campaignId,
  projectName,
  categoryLabel,
  projectUrl,
  entitlementLimits = null,
}: {
  campaignId: number
  projectName: string
  categoryLabel: string | null
  projectUrl: string | null
  entitlementLimits?: SaveLimits | null
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
      limitOverride={entitlementLimits}
    />
  )
}

export function SaveComparisonButton({
  campaignIds,
  campaignNames,
  categoryLabel,
  entitlementLimits = null,
}: {
  campaignIds: number[]
  campaignNames: string[]
  categoryLabel: string | null
  entitlementLimits?: SaveLimits | null
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
      limitOverride={entitlementLimits}
    />
  )
}

function SavedItemsContent({ items, authenticated, onClose }: { items: SavedResearchItem[]; authenticated: boolean; onClose?: () => void }) {
  const groups = [
    { type: 'research', label: 'Research views' },
    { type: 'campaign', label: 'Campaigns' },
    { type: 'comparison', label: 'Comparisons' },
  ] as const

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="bs-kicker">Saved research</p>
          <h2 className="bs-title mt-1 text-lg font-semibold">Your working set</h2>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="bs-button-secondary px-3 py-1.5">Close</button>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Stored in this browser until accounts are introduced.
      </p>
      <div className="mt-4 grid gap-4">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.type === group.type)
          return (
            <section key={group.type}>
              <div className="flex items-center justify-between gap-2">
                <p className="bs-kicker">{group.label}</p>
                <span className="bs-data-chip bg-slate-900 px-2.5 py-0.5 text-white">{groupItems.length}</span>
              </div>
              <div className="mt-2 grid gap-2">
                {groupItems.length ? groupItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-bs-border bg-[color:var(--bs-field-bg)] p-2.5">
                    <Link
                      href={item.href}
                      onClick={() => {
                        postAnalyticsEvent('saved_item_reopened', 'saved-research', {
                          itemType: item.type,
                        })
                        onClose?.()
                      }}
                      className="block text-sm font-medium leading-5 text-slate-900 hover:underline"
                    >
                      {item.label}
                    </Link>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">Snapshot {item.snapshotVersion}</span>
                      <button type="button" onClick={() => { removeResearchItem(item.id); if (authenticated) void removeAccountResearchItem(item.id) }} className="text-xs text-slate-500 underline underline-offset-4">
                        Remove
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-xl border border-dashed border-bs-border p-2.5 text-xs leading-5 text-slate-500">
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
  const { items, authenticated, limits, canUseAiCopilot } = useSavedItems()
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside
        id="onboarding-target-saved-research"
        className="sticky top-28 hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.5rem] border border-bs-border bg-[color:var(--bs-panel)] p-4 shadow-[0_16px_40px_rgba(2,6,23,0.14)] xl:block"
      >
        <SavedItemsContent items={items} authenticated={authenticated} />
        <div className="mt-4 rounded-xl border border-bs-border bg-[color:var(--bs-field-bg)] p-3 text-xs leading-6 text-slate-600">
          <p>Trial caps: {limits.research ?? 'unlimited'} research views, {limits.campaign ?? 'unlimited'} campaigns, {limits.comparison ?? 'unlimited'} comparisons.</p>
          <p className="mt-1">AI Co-pilot: {canUseAiCopilot ? 'included in this plan' : 'paid plans only'}</p>
        </div>
      </aside>
      <button type="button" onClick={() => setOpen(true)} className="bs-button-primary fixed bottom-5 right-5 z-40 shadow-xl xl:hidden">
        Saved ({items.length})
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-4 backdrop-blur-sm xl:hidden" onClick={() => setOpen(false)}>
          <aside className="ml-auto h-full w-full max-w-sm overflow-y-auto rounded-[1.5rem] border border-bs-border bg-[color:var(--bs-panel)] p-4" onClick={(event) => event.stopPropagation()}>
            <SavedItemsContent items={items} authenticated={authenticated} onClose={() => setOpen(false)} />
            <div className="mt-4 rounded-xl border border-bs-border bg-[color:var(--bs-field-bg)] p-3 text-xs leading-6 text-slate-600">
              <p>Trial caps: {limits.research ?? 'unlimited'} research views, {limits.campaign ?? 'unlimited'} campaigns, {limits.comparison ?? 'unlimited'} comparisons.</p>
              <p className="mt-1">AI Co-pilot: {canUseAiCopilot ? 'included in this plan' : 'paid plans only'}</p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
