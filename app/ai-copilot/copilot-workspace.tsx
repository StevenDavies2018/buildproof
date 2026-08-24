'use client'

import Link from 'next/link'
import { useState } from 'react'
import { generateBrief } from './actions'
import { Tooltip } from '@/components/tooltip'

const PAGE_MARGIN = 56
const LINE_HEIGHT = 16

async function downloadBriefPdf(item: WorkspaceItem, brief: { text: string; generatedAt: string }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN * 2
  let y = PAGE_MARGIN

  function ensureSpace(linesNeeded = 1) {
    if (y + linesNeeded * LINE_HEIGHT > pageHeight - PAGE_MARGIN) {
      doc.addPage()
      y = PAGE_MARGIN
    }
  }

  function writeParagraph(text: string, fontSize: number, style: 'normal' | 'bold' = 'normal') {
    doc.setFont('helvetica', style)
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    for (const line of lines) {
      ensureSpace()
      doc.text(line, PAGE_MARGIN, y)
      y += LINE_HEIGHT
    }
  }

  writeParagraph('AI Co-Pilot brief', 18, 'bold')
  y += 6
  writeParagraph(`${TYPE_LABEL[item.itemType]}: ${item.label}`, 12, 'bold')
  writeParagraph(
    `Generated ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(brief.generatedAt))}`,
    10,
  )
  y += 10

  writeParagraph(brief.text, 11)
  y += 14

  ensureSpace(3)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  const disclaimerLines = doc.splitTextToSize(
    'This is AI-generated interpretation, not source evidence. It only narrates the deterministic numbers ' +
    'already visible in Backer Sonar and does not predict campaign outcomes.',
    contentWidth,
  ) as string[]
  for (const line of disclaimerLines) {
    ensureSpace()
    doc.text(line, PAGE_MARGIN, y)
    y += LINE_HEIGHT
  }

  ensureSpace(2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(37, 99, 235)
  doc.textWithLink('Open the saved evidence in Backer Sonar', PAGE_MARGIN, y, {
    url: `${window.location.origin}${item.href}`,
  })
  doc.setTextColor(0, 0, 0)

  const safeLabel = item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'brief'
  doc.save(`backer-sonar-${safeLabel}.pdf`)
}

type WorkspaceItem = {
  itemKey: string
  itemType: 'research' | 'campaign' | 'comparison'
  label: string
  href: string
  savedAt: string
}

type BriefState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; text: string; generatedAt: string }

const TYPE_LABEL: Record<WorkspaceItem['itemType'], string> = {
  research: 'Saved research view',
  campaign: 'Saved campaign',
  comparison: 'Saved comparison',
}

function ItemCard({ item }: { item: WorkspaceItem }) {
  const [brief, setBrief] = useState<BriefState>({ status: 'idle' })
  const [exporting, setExporting] = useState(false)

  async function handleGenerate() {
    setBrief({ status: 'loading' })
    const result = await generateBrief(item.itemKey)
    if (result.ok) {
      setBrief({ status: 'done', text: result.text, generatedAt: result.generatedAt })
    } else {
      setBrief({ status: 'error', message: result.error })
    }
  }

  async function handleExport() {
    if (brief.status !== 'done') return
    setExporting(true)
    try {
      await downloadBriefPdf(item, brief)
    } finally {
      setExporting(false)
    }
  }

  return (
    <article className="bs-panel-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="bs-kicker">{TYPE_LABEL[item.itemType]}</p>
          <h3 className="mt-2 break-words text-lg font-semibold text-slate-900">{item.label}</h3>
          <a href={item.href} className="mt-1 inline-block text-xs text-slate-500 underline underline-offset-4 hover:text-slate-700">
            Open the saved evidence
          </a>
        </div>
        <Tooltip label="Narrates this saved research in plain language. Reads only what you've saved, never invents numbers or predicts outcomes.">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={brief.status === 'loading'}
            className="bs-button-secondary shrink-0"
          >
            {brief.status === 'loading' ? 'Generating…' : brief.status === 'done' ? 'Regenerate brief' : 'Generate brief'}
          </button>
        </Tooltip>
      </div>

      {brief.status === 'error' ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {brief.message}
        </p>
      ) : null}

      {brief.status === 'done' ? (
        <div className="mt-4 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          <p className="whitespace-pre-wrap">{brief.text}</p>
          <p className="mt-3 text-xs text-sky-800">
            Generated {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(brief.generatedAt))}.
            This is AI-generated interpretation, not source evidence &mdash; use the link above to inspect the underlying data.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="bs-button-secondary mt-3"
          >
            {exporting ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      ) : null}
    </article>
  )
}

export function CoPilotWorkspace({ items }: { items: WorkspaceItem[] }) {
  if (!items.length) {
    return (
      <div className="bs-panel-subtle text-sm leading-6 text-slate-600">
        <p>
          Nothing saved yet. AI Co-Pilot only interprets research you&rsquo;ve explicitly saved &mdash; it has
          nothing to work with until you save a research view, campaign, or comparison first.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/reports" className="bs-button-secondary">Save a view from Reporting</Link>
          <Link href="/dashboard" className="bs-button-secondary">Save from Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <ItemCard key={item.itemKey} item={item} />
      ))}
    </div>
  )
}
