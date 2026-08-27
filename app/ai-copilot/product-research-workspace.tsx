'use client'

import { useState } from 'react'
import { researchProductIdea } from './actions'

type Campaign = {
  campaignId: number
  projectName: string
  projectUrl: string | null
  creatorName: string | null
  normalizedStatus: string
  launchedAt: string | null
  goalUsd: number | null
  pledgedUsd: number | null
  backersCount: number | null
}

type ResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'done'
      text: string
      generatedAt: string
      topSuccessfulCampaigns: Campaign[]
      topUnsuccessfulCampaigns: Campaign[]
      totalMatches: number
      successfulCount: number
      unsuccessfulCount: number
    }

function money(value: number | null) {
  if (value === null) return 'n/a'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  if (!campaigns.length) {
    return <p className="mt-3 text-sm text-slate-500">None matched.</p>
  }

  return (
    <ul className="mt-3 grid gap-3">
      {campaigns.map((campaign) => (
        <li key={campaign.campaignId} className="rounded-xl border border-bs-border p-3">
          {campaign.projectUrl ? (
            <a
              href={campaign.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-900 underline underline-offset-4 hover:text-sky-700"
            >
              {campaign.projectName}
            </a>
          ) : (
            <span className="font-semibold text-slate-900">{campaign.projectName}</span>
          )}
          <p className="mt-1 text-xs text-slate-500">
            goal {money(campaign.goalUsd)} &middot; pledged {money(campaign.pledgedUsd)} &middot;
            {' '}{campaign.backersCount ?? 'n/a'} backers &middot; launched {campaign.launchedAt?.slice(0, 10) ?? 'unknown'}
            {campaign.creatorName ? ` · ${campaign.creatorName}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function ProductResearchWorkspace() {
  const [idea, setIdea] = useState('')
  const [excludeTerms, setExcludeTerms] = useState('')
  const [state, setState] = useState<ResultState>({ status: 'idle' })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!idea.trim()) return
    setState({ status: 'loading' })
    const result = await researchProductIdea(idea, excludeTerms)
    if (result.ok) {
      setState({
        status: 'done',
        text: result.text,
        generatedAt: result.generatedAt,
        topSuccessfulCampaigns: result.result.topSuccessfulCampaigns,
        topUnsuccessfulCampaigns: result.result.topUnsuccessfulCampaigns,
        totalMatches: result.result.totalMatches,
        successfulCount: result.result.successfulCount,
        unsuccessfulCount: result.result.unsuccessfulCount,
      })
    } else {
      setState({ status: 'error', message: result.error })
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="bs-panel-subtle grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Product idea</span>
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={3}
            placeholder="Example: I can design a 3D-printable TTRPG product. What product categories show evidence of demand?"
            className="bs-field"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Exclude terms (comma-separated, optional)</span>
          <input
            value={excludeTerms}
            onChange={(event) => setExcludeTerms(event.target.value)}
            placeholder="Example: miniatures, terrain, dice tower, gaming table"
            className="bs-field"
          />
        </label>
        <button type="submit" disabled={state.status === 'loading' || !idea.trim()} className="bs-button-primary justify-self-start">
          {state.status === 'loading' ? 'Researching…' : 'Research this idea'}
        </button>
      </form>

      {state.status === 'error' ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {state.message}
        </p>
      ) : null}

      {state.status === 'done' ? (
        <div className="grid gap-4">
          <div className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
            <p className="whitespace-pre-wrap">{state.text}</p>
            <p className="mt-3 text-xs text-sky-800">
              Generated {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.generatedAt))}.
              {' '}{state.totalMatches} comparable campaigns matched ({state.successfulCount} successful, {state.unsuccessfulCount} unsuccessful).
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bs-panel-subtle">
              <p className="bs-kicker">Successful campaigns</p>
              <CampaignList campaigns={state.topSuccessfulCampaigns} />
            </div>
            <div className="bs-panel-subtle">
              <p className="bs-kicker">Unsuccessful campaigns</p>
              <CampaignList campaigns={state.topUnsuccessfulCampaigns} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
