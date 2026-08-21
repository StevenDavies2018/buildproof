import Link from 'next/link'
import { beginGoogleRegistration } from './actions'

export const dynamic = 'force-dynamic'

export default async function GoogleConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-3xl">
        <section className="bs-panel">
          <p className="bs-kicker">Google registration</p>
          <h1 className="bs-title mt-2 text-4xl font-semibold">Confirm consent before creating your account</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Google can verify identity quickly, but Backer Sonar still needs the same policy and disclaimer consent before creating a new workspace.
          </p>

          {error ? <p className="mt-5 min-w-0 break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{decodeURIComponent(error)}</p> : null}

          <form action={beginGoogleRegistration} className="mt-8 rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-6">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input name="acceptTerms" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
              <span>
                I agree to the <Link href="/terms" className="font-medium text-slate-900 underline underline-offset-4">Terms of use</Link> and <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-4">Privacy policy</Link>.
              </span>
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input name="acknowledgeDisclaimer" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
              <span>
                I understand the <Link href="/legal-disclaimer" className="font-medium text-slate-900 underline underline-offset-4">legal disclaimer</Link> and that Backer Sonar provides research support, not financial, legal, or performance guarantees.
              </span>
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" className="bs-button-primary">Continue with Google</button>
              <Link href="/account" className="bs-button-secondary">Back to account</Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
