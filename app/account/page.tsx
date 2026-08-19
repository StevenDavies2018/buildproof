import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { loginAccount, logoutAccount, registerAccount } from './actions'

export const dynamic = 'force-dynamic'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pending?: string }>
}) {
  const user = await getCurrentUser()
  const { error, pending } = await searchParams

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-5xl">
        <section className="bs-panel">
          <p className="bs-kicker">Backer Sonar account</p>
          <h1 className="bs-title mt-2 text-4xl font-semibold">Keep your research workspace</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Save research views, campaigns, and comparisons across sessions. Accounts are currently limited to this local POC environment.
          </p>

          {error ? <p className="mt-5 min-w-0 break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{decodeURIComponent(error)}</p> : null}
          {pending === 'verification' ? <p className="mt-5 min-w-0 break-words rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-900">Check your email for a verification link before signing in.</p> : null}

          {user ? (
            <div className="mt-8 min-w-0 rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-6">
              <p className="bs-kicker">Signed in</p>
              <h2 className="mt-3 break-words text-2xl font-semibold text-slate-900">{user.displayName}</h2>
              <p className="mt-2 break-all text-sm leading-6 text-slate-600">{user.email}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className="bs-button-primary">Open user view</Link>
                <form action={logoutAccount}><button type="submit" className="bs-button-secondary">Sign out</button></form>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <form action={loginAccount} className="rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
                <p className="bs-kicker">Existing account</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Sign in</h2>
                <label className="mt-5 block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="bs-input mt-2 w-full" /></label>
                <label className="mt-4 block text-sm font-medium text-slate-700">Password<input name="password" type="password" required className="bs-input mt-2 w-full" /></label>
                <button type="submit" className="bs-button-primary mt-5">Sign in</button>
                <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-bs-border" />or<span className="h-px flex-1 bg-bs-border" /></div>
                <a href="/api/auth/google" className="bs-button-secondary inline-flex">Continue with Google</a>
              </form>
              <form action={registerAccount} className="rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
                <p className="bs-kicker">New workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create account</h2>
                <label className="mt-5 block text-sm font-medium text-slate-700">Display name<input name="displayName" required minLength={2} className="bs-input mt-2 w-full" /></label>
                <label className="mt-4 block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="bs-input mt-2 w-full" /></label>
                <label className="mt-4 block text-sm font-medium text-slate-700">Password<input name="password" type="password" required minLength={8} className="bs-input mt-2 w-full" /></label>
                <button type="submit" className="bs-button-primary mt-5">Create account</button>
                <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-bs-border" />or<span className="h-px flex-1 bg-bs-border" /></div>
                <a href="/api/auth/google" className="bs-button-secondary inline-flex">Register with Google</a>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
