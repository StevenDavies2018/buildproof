import Link from 'next/link'
import { PersistedViewLink } from '@/components/persisted-view-link'
import { getAdminUsageOverview } from '@/lib/analytics'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

type UsageSortBy =
  | 'username'
  | 'role'
  | 'signIns'
  | 'dashboardViews'
  | 'reportViews'
  | 'detailViews'
  | 'compareViews'
  | 'searches'
  | 'reportLoads'
  | 'savedItemsCreated'
  | 'savedItemsReopened'
  | 'compareSelections'
  | 'accountReturns'
  | 'onboardingHelpUsage'
  | 'accountLengthDays'
  | 'daysToAccountExpiry'
  | 'accountType'

type UsageSortDir = 'asc' | 'desc'

function compareValue(a: string | number | null, b: string | number | null, dir: UsageSortDir) {
  const order = dir === 'asc' ? 1 : -1
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * order
  return String(a).localeCompare(String(b)) * order
}

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams?: Promise<{ sortBy?: string; sortDir?: string; accountType?: string; role?: string; query?: string }>
}) {
  await requireAdmin()
  const data = await getAdminUsageOverview()
  const resolvedSearchParams = (await searchParams) ?? {}
  const sortBy = (
    ['username', 'role', 'signIns', 'dashboardViews', 'reportViews', 'detailViews', 'compareViews', 'searches', 'reportLoads', 'savedItemsCreated', 'savedItemsReopened', 'compareSelections', 'accountReturns', 'onboardingHelpUsage', 'accountLengthDays', 'daysToAccountExpiry', 'accountType']
      .includes(resolvedSearchParams.sortBy ?? '')
      ? resolvedSearchParams.sortBy
      : 'reportViews'
  ) as UsageSortBy
  const sortDir = (resolvedSearchParams.sortDir === 'asc' ? 'asc' : 'desc') as UsageSortDir
  const accountTypeFilter =
    resolvedSearchParams.accountType === 'free' || resolvedSearchParams.accountType === 'paid'
      ? resolvedSearchParams.accountType
      : 'all'
  const roleFilter =
    resolvedSearchParams.role === 'admin' || resolvedSearchParams.role === 'user'
      ? resolvedSearchParams.role
      : 'all'
  const query = (resolvedSearchParams.query ?? '').trim().toLowerCase()

  if (!data.configured) {
    return (
      <main className="bs-shell">
        <div className="bs-container">
          <section className="bs-panel">
            <p className="bs-kicker">Admin Usage</p>
            <h1 className="bs-title mt-3 text-4xl font-semibold">Database connection required</h1>
            <p className="mt-4 text-sm text-slate-600">Configure `POSTGRES_URL` to load usage counts.</p>
          </section>
        </div>
      </main>
    )
  }

  const filteredRows = data.rows.filter((row) =>
    (accountTypeFilter === 'all' ? true : row.accountType === accountTypeFilter) &&
    (roleFilter === 'all' ? true : row.role === roleFilter) &&
    (query
      ? row.username.toLowerCase().includes(query) || row.email.toLowerCase().includes(query)
      : true),
  )
  const rows = [...filteredRows].sort((left, right) =>
    compareValue(left[sortBy], right[sortBy], sortDir),
  )

  return (
    <main className="bs-shell overflow-x-hidden">
      <div className="bs-container grid gap-8">
        <section className="bs-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="bs-kicker">Admin Usage</p>
              <h1 className="bs-title mt-3 text-4xl font-semibold md:text-5xl">Per-user activity tracking</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                This view shows one horizontal row per user with the core activity counts and trial/account fields you asked for, without drilling into individual event detail.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <PersistedViewLink view="admin" fallbackHref="/admin" className="bs-button-secondary">Curation view</PersistedViewLink>
              <Link href="/admin/users" className="bs-button-secondary">User admin</Link>
            </div>
          </div>

          <nav className="mt-7 flex flex-wrap gap-2" aria-label="Admin sections">
            <Link href="/admin" className="bs-button-secondary">Subset curation</Link>
            <Link href="/admin/quality" className="bs-button-secondary">Data quality</Link>
            <Link href="/admin/quality/research" className="bs-button-secondary">Research QA</Link>
            <Link href="/admin/users" className="bs-button-secondary">Users</Link>
            <Link href="/admin/usage" className="bs-button-primary" aria-current="page">Usage</Link>
          </nav>
        </section>

        <section className="bs-panel overflow-x-auto">
          <p className="bs-kicker">Horizontal table</p>
          <h2 className="bs-title mt-2 text-3xl font-semibold">Users and activity counts</h2>
          <form method="get" action="/admin/usage" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block text-sm font-medium text-slate-700 xl:col-span-2">
              User search
              <input name="query" defaultValue={resolvedSearchParams.query ?? ''} placeholder="Name or email" className="bs-field mt-2 w-full" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Account type
              <select name="accountType" defaultValue={accountTypeFilter} className="bs-field mt-2 w-full">
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Role
              <select name="role" defaultValue={roleFilter} className="bs-field mt-2 w-full">
                <option value="all">All</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Sort by
              <select name="sortBy" defaultValue={sortBy} className="bs-field mt-2 w-full">
                <option value="username">User name</option>
                <option value="role">Role</option>
                <option value="signIns">Sign-ins</option>
                <option value="dashboardViews">Dashboard views</option>
                <option value="reportViews">Report views</option>
                <option value="detailViews">Detail views</option>
                <option value="compareViews">Compare views</option>
                <option value="searches">Searches</option>
                <option value="reportLoads">Report loads</option>
                <option value="savedItemsCreated">Saved items created</option>
                <option value="savedItemsReopened">Saved items reopened</option>
                <option value="compareSelections">Compare selections</option>
                <option value="accountReturns">Return-to-view uses</option>
                <option value="onboardingHelpUsage">Onboarding/help usage</option>
                <option value="accountLengthDays">Account length</option>
                <option value="daysToAccountExpiry">Days to expiry</option>
                <option value="accountType">Account type</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Order
              <select name="sortDir" defaultValue={sortDir} className="bs-field mt-2 w-full">
                <option value="desc">Highest / Z-A first</option>
                <option value="asc">Lowest / A-Z first</option>
              </select>
            </label>
            <div className="md:col-span-2 xl:col-span-5">
              <button type="submit" className="bs-button-primary">Apply</button>
            </div>
          </form>
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-bs-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[color:var(--bs-field-bg)]">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">User</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Role</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Sign-ins</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Dashboard</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Reporting</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Details</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Compare views</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Searches</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Reports loaded</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Saved</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Reopened</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Compare picks</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Return to view</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Onboarding/help</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Account age</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Days to expiry</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Account type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`summary-${row.userId}`}
                    className={index % 2 === 0 ? 'bg-transparent' : 'bg-[color:var(--bs-field-bg)]/50'}
                  >
                    <td className="px-3 py-2 align-top text-sm font-medium text-slate-900">
                      <div className="leading-5">{row.username}</div>
                        <div className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{row.email}</div>
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {row.role === 'admin' ? 'Admin' : 'User'}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.signIns)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.dashboardViews)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.reportViews)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.detailViews)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.compareViews)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.searches)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.reportLoads)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.savedItemsCreated)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.savedItemsReopened)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.compareSelections)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.accountReturns)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatInteger(row.onboardingHelpUsage)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatInteger(row.accountLengthDays)}d</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {row.daysToAccountExpiry === null ? 'n/a' : `${formatInteger(row.daysToAccountExpiry)}d`}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {row.accountType === 'paid' ? 'Paid' : 'Free'}
                      </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={17} className="px-3 py-6 text-center text-sm text-slate-500">
                      No users match the current usage filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
