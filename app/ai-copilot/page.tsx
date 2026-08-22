import { fetchSavedResearchRowsForUser, hasAiCopilotConfig } from '@/lib/ai-copilot'
import { requireAiCopilotAccess } from '@/lib/auth'
import { CoPilotWorkspace } from './copilot-workspace'

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

        <section className="mt-6 grid gap-4">
          <CoPilotWorkspace items={items} />
        </section>
      </div>
    </main>
  )
}
