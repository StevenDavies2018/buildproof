import Link from 'next/link'
import { getAdminQualityOverview } from '@/lib/admin-quality'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value: number, total: number) {
  if (!total) return '0.0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

function QualityCard({
  label,
  value,
  total,
  healthy = false,
}: {
  label: string
  value: number
  total: number
  healthy?: boolean
}) {
  const needsReview = healthy ? value < total : value > 0
  return (
    <article className={`bs-metric-card ${needsReview ? 'border-amber-400/60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="bs-kicker">{label}</p>
        <span className={`bs-data-chip ${needsReview ? 'bs-trend-softening' : 'bs-trend-rising'}`}>
          {needsReview ? 'Review' : 'Clear'}
        </span>
      </div>
      <p className="bs-title mt-4 text-3xl font-semibold">{formatInteger(value)}</p>
      <p className="mt-2 text-sm text-slate-500">
        {formatPercent(value, total)} of the POC dataset
      </p>
    </article>
  )
}

export default async function AdminQualityPage() {
  await requireAdmin()
  const data = await getAdminQualityOverview()

  if (!data.configured) {
    return (
      <main className="bs-shell">
        <div className="bs-container">
          <section className="bs-panel">
            <p className="bs-kicker">Admin Data Quality</p>
            <h1 className="bs-title mt-3 text-4xl font-semibold">Database connection required</h1>
            <p className="mt-4 text-sm text-slate-600">Configure `POSTGRES_URL` to load the quality audit.</p>
          </section>
        </div>
      </main>
    )
  }

  const { summary } = data
  const issueCards = [
    ['Missing campaign URL', summary.missingProjectUrl],
    ['Missing normalized record', summary.missingNormalizedRecord],
    ['Invalid campaign URL', summary.invalidProjectUrl],
    ['Missing description', summary.missingDescription],
    ['Missing launch date', summary.missingLaunchDate],
    ['Missing deadline', summary.missingDeadline],
    ['Invalid date order', summary.invalidDateOrder],
    ['Missing duration', summary.missingDuration],
    ['Suspicious duration', summary.invalidDuration],
    ['Missing native money', summary.missingNativeMoney],
    ['Money not comparable', summary.missingComparableMoney],
    ['Currency rate unavailable', summary.unavailableCurrencyRate],
    ['Invalid currency rate', summary.invalidCurrencyRate],
    ['Goal conversion mismatch', summary.goalFormulaMismatch],
    ['Pledged conversion mismatch', summary.pledgedFormulaMismatch],
    ['Missing classification', summary.missingClassification],
    ['Missing primary category', summary.missingPrimaryClassification],
    ['Duplicate project URLs', summary.duplicateProjectUrls],
  ] as const

  return (
    <main className="bs-shell overflow-x-hidden">
      <div className="bs-container grid gap-8">
        <section className="bs-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="bs-kicker">Admin Data Quality</p>
              <h1 className="bs-title mt-3 text-4xl font-semibold md:text-5xl">Trust starts with visible gaps.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                This read-only audit checks the current TTRPG proof-of-concept dataset for source, date, money, normalization, and taxonomy issues before those records reach user-facing research.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="bs-button-secondary">Curation view</Link>
              <Link href="/reports" className="bs-button-primary">Reporting view</Link>
            </div>
          </div>

          <nav className="mt-7 flex flex-wrap gap-2" aria-label="Admin sections">
            <Link href="/admin" className="bs-button-secondary">Subset curation</Link>
            <Link href="/admin/quality" className="bs-button-primary" aria-current="page">Data quality</Link>
            <Link href="/admin/quality/research" className="bs-button-secondary">Research QA</Link>
          </nav>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <QualityCard label="POC campaigns" value={summary.totalCampaigns} total={summary.totalCampaigns} healthy />
          <QualityCard label="Fully researchable" value={summary.fullyResearchable} total={summary.totalCampaigns} healthy />
          <QualityCard
            label="Priority queue shown"
            value={data.issueRows.length}
            total={summary.totalCampaigns}
          />
        </section>

        <section className="bs-panel">
          <div>
            <p className="bs-kicker">Integrity checks</p>
            <h2 className="bs-title mt-2 text-3xl font-semibold">Coverage and exceptions</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Zero is healthy for exception cards. Fully researchable measures campaigns with enough source detail for direct study.
            </p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {issueCards.map(([label, value]) => (
              <QualityCard key={label} label={label} value={value} total={summary.totalCampaigns} />
            ))}
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <div className="bs-panel">
            <p className="bs-kicker">Currency normalization</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Rate source and confidence</h2>
            <div className="mt-6 grid gap-3">
              {data.normalizationBreakdown.map((row) => (
                <div key={`${row.label}-${row.detail}`} className="bs-panel-subtle flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{row.label.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-sm text-slate-500">Confidence: {row.detail}</p>
                  </div>
                  <p className="font-mono text-lg font-semibold text-slate-900">{formatInteger(row.campaignCount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bs-panel">
            <p className="bs-kicker">Status normalization</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">Normalized and source states</h2>
            <div className="mt-6 grid gap-3">
              {data.statusBreakdown.map((row) => (
                <div key={`${row.label}-${row.detail}`} className="bs-panel-subtle flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{row.label}</p>
                    <p className="mt-1 text-sm text-slate-500">Source: {row.detail}</p>
                  </div>
                  <p className="font-mono text-lg font-semibold text-slate-900">{formatInteger(row.campaignCount)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bs-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bs-kicker">Active provenance</p>
              <h2 className="bs-title mt-2 text-2xl font-semibold">Versions behind this audit</h2>
            </div>
            <p className="text-sm text-slate-500">
              Analysis refreshed {data.versions.analysisCalculatedAt
                ? new Date(data.versions.analysisCalculatedAt).toLocaleString('en-US')
                : 'not available'}
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Dataset snapshot', data.versions.sourceSnapshotVersion],
              ['Currency normalization', data.versions.normalizationVersion],
              ['Classification', data.versions.classificationVersion],
              ['Analysis', data.versions.analysisVersion],
            ].map(([label, value]) => (
              <div key={label} className="bs-panel-subtle">
                <p className="bs-kicker">{label}</p>
                <p className="mt-3 break-words font-mono text-sm font-semibold text-slate-900">{value ?? 'Unavailable'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bs-panel">
          <div>
            <p className="bs-kicker">Review queue</p>
            <h2 className="bs-title mt-2 text-3xl font-semibold">Campaigns with the most quality flags</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Showing up to 25 records, ordered by the number of detected issues. This queue is diagnostic and does not change subset membership.
            </p>
          </div>
          <div className="mt-6 grid gap-4">
            {data.issueRows.map((campaign) => (
              <article key={campaign.campaignId} className="bs-panel-subtle flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <Link href={`/campaigns/${campaign.campaignId}`} className="font-semibold text-slate-900 hover:underline">
                    {campaign.projectName}
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {campaign.issues.map((issue) => (
                      <span key={issue} className="bs-data-chip bs-trend-softening">{issue}</span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/campaigns/${campaign.campaignId}`} className="bs-button-secondary">Inspect record</Link>
                  {campaign.projectUrl ? (
                    <a href={campaign.projectUrl} target="_blank" rel="noreferrer" className="bs-button-primary">Kickstarter</a>
                  ) : null}
                </div>
              </article>
            ))}
            {data.issueRows.length === 0 ? (
              <div className="bs-panel-subtle text-sm text-slate-600">No campaign-level quality exceptions were found.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
