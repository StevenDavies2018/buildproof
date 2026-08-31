import Link from 'next/link'
import { PersistedViewLink } from '@/components/persisted-view-link'
import {
  createManagedAccountAction,
  deleteManagedAccountAction,
  revokeManagedAccountSessionsAction,
  updateManagedAccountAction,
  updateManagedAccountPasswordAction,
} from './actions'
import { getAdminUsersOverview } from '@/lib/admin-users'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleString('en-US')
}

function formatDateTimeLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getDaysSince(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
}

function getDaysUntil(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000))
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <article className="bs-metric-card">
      <p className="bs-kicker">{label}</p>
      <p className="bs-title mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  )
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>
}) {
  const admin = await requireAdmin()
  const adminEmail = admin?.email ?? 'admin'
  const adminUserId = admin?.id ?? 0
  const data = await getAdminUsersOverview()
  const resolvedSearchParams = (await searchParams) ?? {}

  if (!data.configured) {
    return (
      <main className="bs-shell">
        <div className="bs-container">
          <section className="bs-panel">
            <p className="bs-kicker">Admin Users</p>
            <h1 className="bs-title mt-3 text-4xl font-semibold">Database connection required</h1>
            <p className="mt-4 text-sm text-slate-600">Configure `POSTGRES_URL` to load account statistics and controls.</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="bs-shell overflow-x-hidden">
      <div className="bs-container grid gap-8">
        <section className="bs-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="bs-kicker">Admin Users</p>
              <h1 className="bs-title mt-3 text-4xl font-semibold md:text-5xl">Account operations and adoption signals.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                Review account verification, saved-research usage, onboarding state, consent coverage, and active sessions. Create, edit, or remove accounts without leaving the admin workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <PersistedViewLink view="admin" fallbackHref="/admin" className="bs-button-secondary">Curation view</PersistedViewLink>
              <PersistedViewLink view="reports" fallbackHref="/reports" className="bs-button-primary">Reporting view</PersistedViewLink>
            </div>
          </div>

          <nav className="mt-7 flex flex-wrap gap-2" aria-label="Admin sections">
            <Link href="/admin" className="bs-button-secondary">Subset curation</Link>
            <Link href="/admin/quality" className="bs-button-secondary">Data quality</Link>
            <Link href="/admin/quality/research" className="bs-button-secondary">Research QA</Link>
            <Link href="/admin/users" className="bs-button-primary" aria-current="page">Users</Link>
          </nav>

          {resolvedSearchParams.error ? <p className="mt-5 min-w-0 break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{decodeURIComponent(resolvedSearchParams.error)}</p> : null}
          {resolvedSearchParams.success ? <p className="mt-5 min-w-0 break-words rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{decodeURIComponent(resolvedSearchParams.success)}</p> : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total users" value={formatInteger(data.summary.totalUsers)} hint="All local and Google-backed accounts." />
          <MetricCard label="Admin users" value={formatInteger(data.summary.adminUsers)} hint="Accounts with elevated workspace access." />
          <MetricCard label="Verified users" value={formatInteger(data.summary.verifiedUsers)} hint="Accounts allowed to sign in directly." />
          <MetricCard label="Google accounts" value={formatInteger(data.summary.googleUsers)} hint="Users with a Google subject linked." />
          <MetricCard label="Consent complete" value={formatInteger(data.summary.consentCompleteUsers)} hint="All three policy timestamps recorded." />
          <MetricCard label="Active sessions" value={formatInteger(data.summary.activeSessions)} hint="Non-expired sessions in the app." />
          <MetricCard label="Saved items" value={formatInteger(data.summary.savedResearchItems)} hint="Research views, campaigns, and comparisons saved." />
          <MetricCard label="Consent gaps" value={formatInteger(data.summary.totalUsers - data.summary.consentCompleteUsers)} hint="Likely legacy accounts created before consent capture." />
        </section>

        <section className="bs-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bs-kicker">Create account</p>
              <h2 className="bs-title mt-2 text-3xl font-semibold">Admin-managed account creation</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Use this only when you need a support-created account. Consent checkboxes are required here too so the audit trail matches self-service signup.
              </p>
            </div>
            <p className="text-sm text-slate-500">Signed in as {adminEmail}</p>
          </div>

          <form action={createManagedAccountAction} className="mt-6 grid gap-4 xl:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Display name
              <input name="displayName" required minLength={2} className="bs-field mt-2 w-full" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input name="email" type="email" required className="bs-field mt-2 w-full" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Temporary password
              <input name="password" type="password" required minLength={8} className="bs-field mt-2 w-full" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Role
              <select name="role" defaultValue="user" className="bs-field mt-2 w-full">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Account type
              <select name="accountType" defaultValue="free" className="bs-field mt-2 w-full">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Trial days
              <input name="trialDays" type="number" min={0} defaultValue={7} className="bs-field mt-2 w-full" />
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700 xl:col-span-2">
              <input name="emailVerified" type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
              <span>Mark email as already verified at creation time.</span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700 xl:col-span-2">
              <input name="acceptTerms" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
              <span>Admin confirms Terms of use and Privacy policy acceptance has been captured.</span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700 xl:col-span-2">
              <input name="acknowledgeDisclaimer" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
              <span>Admin confirms legal disclaimer acknowledgement has been captured.</span>
            </label>
            <div className="xl:col-span-2">
              <button type="submit" className="bs-button-primary">Create managed account</button>
            </div>
          </form>
        </section>

        <section className="bs-panel">
          <div>
            <p className="bs-kicker">User roster</p>
            <h2 className="bs-title mt-2 text-3xl font-semibold">Full account CRUD</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Update account profile fields inline, review consent and usage signals, or remove accounts. Deleting an account also removes its sessions, onboarding state, and saved research through database cascades.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-bs-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[color:var(--bs-field-bg)]">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">User</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Role</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Type</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Verified</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Consent</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Account age</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Days to expiry</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Trial ends</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Sessions</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Saved</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user, index) => {
                  const consentComplete = Boolean(
                    user.termsAcceptedAt &&
                    user.privacyAcceptedAt &&
                    user.legalDisclaimerAcknowledgedAt,
                  )
                  const accountAgeDays = getDaysSince(user.createdAt)
                  const daysToExpiry = user.accountType === 'paid' ? null : getDaysUntil(user.trialEndsAt)

                  return (
                    <tr
                      key={`list-${user.id}`}
                      className={index % 2 === 0 ? 'bg-transparent' : 'bg-[color:var(--bs-field-bg)]/50'}
                    >
                      <td className="px-3 py-2 align-top text-sm font-medium text-slate-900">
                        <div className="leading-5">{user.displayName}</div>
                        <div className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {user.accountType === 'paid' ? 'Paid' : 'Free'}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {user.emailVerifiedAt ? 'Yes' : 'No'}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {consentComplete ? 'Complete' : 'Gap'}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {accountAgeDays === null ? 'n/a' : `${formatInteger(accountAgeDays)}d`}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {daysToExpiry === null ? (user.accountType === 'paid' ? 'n/a' : 'Not recorded') : `${formatInteger(daysToExpiry)}d`}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {formatDateTime(user.trialEndsAt)}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {formatInteger(user.sessionCount)}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {formatInteger(user.savedItemCount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4">
            {data.users.map((user) => {
              const consentComplete = Boolean(
                user.termsAcceptedAt &&
                user.privacyAcceptedAt &&
                user.legalDisclaimerAcknowledgedAt,
              )

              return (
                <article key={user.id} className="bs-panel-subtle">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-semibold text-slate-900">{user.displayName}</h3>
                        <span className={`bs-data-chip ${user.role === 'admin' ? 'bs-trend-rising' : ''}`}>{user.role}</span>
                        <span className={`bs-data-chip ${user.emailVerifiedAt ? 'bs-trend-rising' : 'bs-trend-softening'}`}>
                          {user.emailVerifiedAt ? 'Verified' : 'Unverified'}
                        </span>
                        <span className="bs-data-chip">{user.accountType === 'paid' ? 'Paid' : 'Free'}</span>
                        <span className={`bs-data-chip ${consentComplete ? 'bs-trend-rising' : 'bs-trend-softening'}`}>
                          {consentComplete ? 'Consent complete' : 'Consent gap'}
                        </span>
                        {user.googleSubject ? <span className="bs-data-chip">Google</span> : <span className="bs-data-chip">Local</span>}
                      </div>
                      <p className="mt-2 break-all text-sm text-slate-600">{user.email}</p>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-2 xl:min-w-[26rem] xl:max-w-[32rem]">
                      <div>
                        <p className="bs-kicker">Created</p>
                        <p className="mt-1">{formatDateTime(user.createdAt)}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Updated</p>
                        <p className="mt-1">{formatDateTime(user.updatedAt)}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Trial ends</p>
                        <p className="mt-1">{formatDateTime(user.trialEndsAt)}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Account type</p>
                        <p className="mt-1">{user.accountType === 'paid' ? 'Paid' : 'Free'}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Terms accepted</p>
                        <p className="mt-1">{formatDateTime(user.termsAcceptedAt)}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Disclaimer acknowledged</p>
                        <p className="mt-1">{formatDateTime(user.legalDisclaimerAcknowledgedAt)}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Saved research</p>
                        <p className="mt-1">{formatInteger(user.savedItemCount)} total</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Sessions</p>
                        <p className="mt-1">{formatInteger(user.sessionCount)} active</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Onboarding</p>
                        <p className="mt-1">{user.onboardingStatus ?? 'Not started'}</p>
                      </div>
                      <div>
                        <p className="bs-kicker">Saved mix</p>
                        <p className="mt-1">
                          {formatInteger(user.researchViewCount)} research / {formatInteger(user.campaignSaveCount)} campaigns / {formatInteger(user.comparisonSaveCount)} comparisons
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                    <form action={updateManagedAccountAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <input type="hidden" name="userId" value={String(user.id)} />
                      <label className="block text-sm font-medium text-slate-700">
                        Display name
                        <input name="displayName" defaultValue={user.displayName} required minLength={2} className="bs-field mt-2 w-full" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Email
                        <input name="email" type="email" defaultValue={user.email} required className="bs-field mt-2 w-full" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Role
                        <select name="role" defaultValue={user.role} className="bs-field mt-2 w-full">
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Account type
                        <select name="accountType" defaultValue={user.accountType} className="bs-field mt-2 w-full">
                          <option value="free">Free</option>
                          <option value="paid">Paid</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Trial end
                        <input
                          name="trialEndsAt"
                          type="datetime-local"
                          defaultValue={formatDateTimeLocalInput(user.trialEndsAt)}
                          required
                          className="bs-field mt-2 w-full"
                        />
                      </label>
                      <label className="flex items-center gap-3 text-sm font-medium text-slate-700 xl:self-end">
                        <input name="emailVerified" type="checkbox" defaultChecked={Boolean(user.emailVerifiedAt)} className="h-4 w-4 shrink-0 rounded border-bs-border" />
                        Email verified
                      </label>
                      <div className="md:col-span-2 xl:col-span-4">
                        <button type="submit" className="bs-button-primary">Save account</button>
                      </div>
                    </form>

                    <div className="grid gap-3 xl:self-end">
                      <form action={updateManagedAccountPasswordAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="userId" value={String(user.id)} />
                        <label className="block text-sm font-medium text-slate-700">
                          Update password
                          <input
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            placeholder="New password"
                            className="bs-field mt-2 w-full"
                          />
                        </label>
                        <button type="submit" className="bs-button-secondary">Set password</button>
                      </form>

                      <form action={revokeManagedAccountSessionsAction}>
                        <input type="hidden" name="userId" value={String(user.id)} />
                        <button type="submit" className="bs-button-secondary">Sign out everywhere</button>
                      </form>

                      <form action={deleteManagedAccountAction}>
                        <input type="hidden" name="userId" value={String(user.id)} />
                        <button
                          type="submit"
                          className="bs-button-secondary"
                          disabled={user.id === adminUserId}
                          title={user.id === adminUserId ? 'You cannot delete your own account' : undefined}
                        >
                          Delete account
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
