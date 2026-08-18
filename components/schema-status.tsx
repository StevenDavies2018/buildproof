import { getSchemaStatus } from '@/lib/schema'

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`bs-data-chip uppercase tracking-[0.2em] ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {active ? 'Ready' : 'Pending'}
    </span>
  )
}

export default async function SchemaStatus() {
  const status = await getSchemaStatus()

  return (
    <section className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
      <div className="bs-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="bs-kicker">
              Phase 1
            </p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">
              Core Neon Schema
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              The first implementation slice is the category-agnostic data
              foundation: imports, raw campaigns, normalized campaign facts,
              and subset membership for the TTRPG proof of concept.
            </p>
          </div>
          <StatusPill active={status.ready} />
        </div>

        <div className="mt-8 grid gap-4">
          {status.tables.map((table) => (
            <div
              key={table.name}
              className="bs-panel-subtle"
            >
              <div className="flex items-center justify-between gap-4">
                <code className="font-mono text-sm font-semibold text-slate-950">
                  {table.name}
                </code>
                <StatusPill active={table.exists} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {table.description}
              </p>
              {table.rowCount !== null ? (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Rows: {table.rowCount}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-bs-border bg-[linear-gradient(180deg,_rgba(30,64,175,0.96)_0%,_rgba(30,58,138,0.96)_100%)] p-8 text-white shadow-[0_18px_40px_rgba(30,64,175,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/70">
          Current Focus
        </p>
        <h2 className="bs-title mt-2 text-2xl font-semibold text-white">
          Backer Sonar POC
        </h2>
        <div className="mt-6 space-y-5 text-sm leading-7 text-blue-50/85">
          <p>
            The app is no longer the stock Postgres demo. The data pipeline has
            already validated a full Kickstarter snapshot, deduplicated it, and
            extracted an initial TTRPG subset for curation.
          </p>
          <p>
            The next meaningful milestone is getting the core tables into Neon
            so the import and subset curation workflow can move out of flat
            files and into the app stack.
          </p>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/8 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/65">
            Environment
          </p>
          <p className="mt-2 text-sm text-white/90">
            Database configured:{' '}
            <span className="font-semibold">
              {status.configured ? 'Yes' : 'No'}
            </span>
          </p>
          <p className="mt-2 text-sm text-white/80">
            When `POSTGRES_URL` is connected, we can bootstrap and verify the
            Neon schema from the app workflow.
          </p>
        </div>

        {status.summary ? (
          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/65">
              Current Counts
            </p>
            <div className="mt-4 grid gap-3 text-sm text-white">
              <p>
                Dataset imports:{' '}
                <span className="font-semibold">
                  {status.summary.datasetImports}
                </span>
              </p>
              <p>
                Raw campaigns:{' '}
                <span className="font-semibold">
                  {status.summary.campaignsRaw}
                </span>
              </p>
              <p>
                Normalized campaigns:{' '}
                <span className="font-semibold">
                  {status.summary.campaignsNormalized}
                </span>
              </p>
              <p>
                Currency normalizations:{' '}
                <span className="font-semibold">
                  {status.summary.campaignCurrencyNormalizations}
                </span>
              </p>
              <p>
                Subset memberships:{' '}
                <span className="font-semibold">
                  {status.summary.subsetMemberships}
                </span>
              </p>
              <p>
                Taxonomy nodes:{' '}
                <span className="font-semibold">
                  {status.summary.taxonomyNodes}
                </span>
              </p>
              <p>
                Campaign classifications:{' '}
                <span className="font-semibold">
                  {status.summary.campaignClassifications}
                </span>
              </p>
              <p>
                Analysis metrics:{' '}
                <span className="font-semibold">
                  {status.summary.analysisCategoryMetrics}
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
