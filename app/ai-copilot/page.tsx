import { fetchSavedResearchRowsForUser, hasAiCopilotConfig } from '@/lib/ai-copilot'
import { requireAiCopilotAccess } from '@/lib/auth'
import { CoPilotWorkspace } from './copilot-workspace'
import { ProductResearchWorkspace } from './product-research-workspace'

export const dynamic = 'force-dynamic'

export default async function AiCopilotPage() {
  const user = await requireAiCopilotAccess()
  const configured = hasAiCopilotConfig()
  const rows = configured ? await fetchSavedResearchRowsForUser(user.id) : []

  const items = rows.map((row) => ({
    itemKey: row.itemKey,
    itemType: row.itemType,
    label: row.label,
    href: row.href,
    savedAt: row.savedAt,
  }))

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-4xl">
        <section className="bs-panel">
          <p className="bs-kicker">AI Co-Pilot</p>
          <h1 className="bs-title mt-2 text-4xl font-semibold">Interpret your saved research</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            AI Co-Pilot only reads research you have explicitly saved. It narrates the same deterministic numbers
            already visible in Dashboard and Reporting &mdash; it does not invent data, does not predict campaign
            outcomes, and does not tell you what to build. Every brief is labeled as AI-generated interpretation,
            and links back to the underlying evidence.
          </p>

          {!configured ? (
            <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              AI Co-Pilot is enabled for this account, but no <code>ANTHROPIC_API_KEY</code> is configured on the
              server yet. Add it to <code>.env.local</code> and restart the app to generate briefs.
            </p>
          ) : null}
        </section>

        <section className="mt-10 bs-panel">
          <p className="bs-kicker">Product concept research</p>
          <h2 className="bs-title mt-2 text-2xl font-semibold">What could I build?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Describe a product you could design or manufacture. This searches the full historical dataset for
            comparable campaigns from the last 5 years, computes deterministic market signals (funding, backers,
            launch frequency, repeat creators, success vs. failure), and only then asks AI Co-Pilot to interpret
            those numbers &mdash; it never invents a statistic or a campaign link.
          </p>
          <div className="mt-6">
            <ProductResearchWorkspace />
          </div>
        </section>

        <section className="mt-10 grid gap-4">
          <p className="bs-kicker">Saved research</p>
          <CoPilotWorkspace items={items} />
        </section>
      </div>
    </main>
  )
}
