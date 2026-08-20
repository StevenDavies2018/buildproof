import Link from 'next/link'
import { PersistedViewLink } from '@/components/persisted-view-link'
import {
  getResearchBenchmarkReport,
  type ResearchBenchmarkResult,
} from '@/lib/research-benchmarks'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function verdictClass(verdict: 'pass' | 'warning' | 'fail' | 'approved' | 'needs_review') {
  if (verdict === 'pass' || verdict === 'approved') return 'bs-trend-rising'
  if (verdict === 'warning') return 'bs-trend-steady'
  return 'bs-trend-softening'
}

function verdictLabel(verdict: 'pass' | 'warning' | 'fail' | 'approved' | 'needs_review') {
  return verdict.replace('_', ' ')
}

function BenchmarkCard({ benchmark }: { benchmark: ResearchBenchmarkResult }) {
  const userViewHref = `/dashboard?view=campaigns&search=${encodeURIComponent(benchmark.idea)}&sortBy=recommended`

  return (
    <article className="bs-panel">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="bs-kicker">{benchmark.key.replaceAll('-', ' ')}</p>
          <h2 className="bs-title mt-2 text-2xl font-semibold">{benchmark.idea}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{benchmark.intent}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {benchmark.expectedTaxonomy.map((label) => (
              <span key={label} className="bs-data-chip bg-slate-900 text-white">Expected: {label}</span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className={`bs-data-chip ${verdictClass(benchmark.automaticVerdict)}`}>
            Automatic: {verdictLabel(benchmark.automaticVerdict)}
          </span>
          <span className={`bs-data-chip ${verdictClass(benchmark.manualVerdict)}`}>
            Human: {verdictLabel(benchmark.manualVerdict)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="bs-panel-subtle">
          <p className="bs-kicker">Taxonomy precision</p>
          <p className="bs-title mt-2 text-2xl font-semibold">{benchmark.taxonomyHits}/5</p>
        </div>
        <div className="bs-panel-subtle">
          <p className="bs-kicker">Trusted examples</p>
          <p className="bs-title mt-2 text-2xl font-semibold">{benchmark.trustedHits}/5</p>
        </div>
        <div className="bs-panel-subtle">
          <p className="bs-kicker">Researchable records</p>
          <p className="bs-title mt-2 text-2xl font-semibold">{benchmark.researchableHits}/5</p>
        </div>
      </div>

      <div className={`mt-5 rounded-[1.25rem] border p-4 ${benchmark.manualVerdict === 'approved' ? 'border-emerald-300/40 bg-emerald-50/10' : 'border-amber-300/50 bg-amber-50/10'}`}>
        <p className="bs-kicker">Manual review note</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{benchmark.reviewNote}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-bs-border">
        <div className="border-b border-bs-border bg-bs-panelAlt px-5 py-4">
          <p className="bs-kicker">Current top five</p>
        </div>
        <div className="divide-y divide-bs-border">
          {benchmark.topResults.map((campaign, index) => (
            <div key={campaign.campaignId} className="grid gap-4 px-5 py-4 lg:grid-cols-[auto,1fr,auto] lg:items-start">
              <span className="font-mono text-sm font-semibold text-slate-500">#{index + 1}</span>
              <div className="min-w-0">
                <Link href={`/campaigns/${campaign.campaignId}?returnTo=${encodeURIComponent('/admin/quality/research')}`} className="font-semibold text-slate-900 hover:underline">
                  {campaign.projectName}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {campaign.primaryClassificationLabel ?? 'No primary category'} | {campaign.taxonomyLabels.join(', ') || 'No taxonomy labels'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {campaign.matchReasons.slice(0, 3).map((reason) => (
                    <span key={reason} className="bs-data-chip">{reason}</span>
                  ))}
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-slate-900">Score {campaign.relevanceScore}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={userViewHref} className="bs-button-primary">Run in User View</Link>
        <Link href={`/campaigns/${benchmark.topResults[0]?.campaignId ?? ''}?returnTo=${encodeURIComponent('/admin/quality/research')}`} className="bs-button-secondary">Inspect top result</Link>
      </div>
    </article>
  )
}

export default async function ResearchBenchmarkPage() {
  await requireAdmin()
  const report = await getResearchBenchmarkReport()

  if (!report.configured) {
    return (
      <main className="bs-shell">
        <div className="bs-container">
          <section className="bs-panel">
            <p className="bs-kicker">Research QA</p>
            <h1 className="bs-title mt-3 text-4xl font-semibold">Database connection required</h1>
          </section>
        </div>
      </main>
    )
  }

  const automaticPasses = report.results.filter((result) => result.automaticVerdict === 'pass').length
  const humanApprovals = report.results.filter((result) => result.manualVerdict === 'approved').length

  return (
    <main className="bs-shell overflow-x-hidden">
      <div className="bs-container grid gap-8">
        <section className="bs-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="bs-kicker">Admin Research QA</p>
              <h1 className="bs-title mt-3 text-4xl font-semibold md:text-5xl">Benchmark the evidence, not the wording.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                These fixed research ideas rerun the deterministic lexical ranker against the current POC snapshot. Automatic checks measure taxonomy precision, trusted examples, and source completeness; human notes record whether the result set answers the intended research question.
              </p>
            </div>
            <PersistedViewLink view="admin" fallbackHref="/admin/quality" className="bs-button-secondary">Back to data quality</PersistedViewLink>
          </div>

          <nav className="mt-7 flex flex-wrap gap-2" aria-label="Admin sections">
            <Link href="/admin" className="bs-button-secondary">Subset curation</Link>
            <Link href="/admin/quality" className="bs-button-secondary">Data quality</Link>
            <Link href="/admin/quality/research" className="bs-button-primary" aria-current="page">Research QA</Link>
          </nav>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Benchmarks', `${report.results.length}`],
            ['Automatic passes', `${automaticPasses}/${report.results.length}`],
            ['Human approvals', `${humanApprovals}/${report.results.length}`],
            ['Ranking version', report.rankingVersion],
          ].map(([label, value]) => (
            <div key={label} className="bs-metric-card">
              <p className="bs-kicker">{label}</p>
              <p className="bs-title mt-3 break-words text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="bs-toolbar grid gap-4 md:grid-cols-3">
          <div>
            <p className="bs-kicker">Benchmark version</p>
            <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{report.benchmarkVersion}</p>
          </div>
          <div>
            <p className="bs-kicker">Dataset snapshot</p>
            <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{report.snapshotVersion}</p>
          </div>
          <div>
            <p className="bs-kicker">Review rule</p>
            <p className="mt-2 text-sm text-slate-600">Top five results per idea; no LLM or embeddings.</p>
          </div>
        </section>

        {report.results.map((benchmark) => (
          <BenchmarkCard key={benchmark.key} benchmark={benchmark} />
        ))}
      </div>
    </main>
  )
}
