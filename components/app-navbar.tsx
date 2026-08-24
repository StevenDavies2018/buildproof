'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AuthUser } from '@/lib/auth'
import { logoutAccount } from '@/app/account/actions'
import {
  ADMIN_VIEW_STATE_KEY,
  DASHBOARD_VIEW_STATE_KEY,
  REPORTS_VIEW_STATE_KEY,
} from '@/lib/view-state'
import {
  getOnboardingStorageKey,
  ONBOARDING_OPEN_EVENT,
  ONBOARDING_STATUS_CHANGED_EVENT,
  type OnboardingStatus,
} from '@/lib/onboarding'
export default function AppNavbar({ user, showAiCopilot = false }: { user: AuthUser | null; showAiCopilot?: boolean }) {
  const pathname = usePathname()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('not_started')
  const [storedAdminHref, setStoredAdminHref] = useState('/admin')
  const [storedDashboardHref, setStoredDashboardHref] = useState('/dashboard')
  const [storedReportsHref, setStoredReportsHref] = useState('/reports')
  const [currentQuery, setCurrentQuery] = useState('')

  useEffect(() => {
    try {
      const adminHref = window.localStorage.getItem(ADMIN_VIEW_STATE_KEY)
      const dashboardHref = window.localStorage.getItem(DASHBOARD_VIEW_STATE_KEY)
      const reportsHref = window.localStorage.getItem(REPORTS_VIEW_STATE_KEY)
      if (adminHref) setStoredAdminHref(adminHref)
      if (dashboardHref) setStoredDashboardHref(dashboardHref)
      if (reportsHref) setStoredReportsHref(reportsHref)
    } catch {
      setStoredAdminHref('/admin')
      setStoredDashboardHref('/dashboard')
      setStoredReportsHref('/reports')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setCurrentQuery(window.location.search.replace(/^\?/, ''))
  }, [pathname])

  useEffect(() => {
    if (!user) {
      setOnboardingStatus('not_started')
      return
    }
    const userId = user.id

    function readStatus() {
      try {
        const stored = window.localStorage.getItem(getOnboardingStorageKey(userId))
        setOnboardingStatus(
          stored === 'completed' || stored === 'skipped' ? stored : 'not_started',
        )
      } catch {
        setOnboardingStatus('not_started')
      }
    }

    function handleStatusChanged(event: Event) {
      const detail = (event as CustomEvent<{ userId?: number; status?: OnboardingStatus }>).detail
      if (detail?.userId && detail.userId !== userId) return
      readStatus()
    }

    readStatus()
    window.addEventListener(ONBOARDING_STATUS_CHANGED_EVENT, handleStatusChanged)
    return () => window.removeEventListener(ONBOARDING_STATUS_CHANGED_EVENT, handleStatusChanged)
  }, [user])

  if (
    pathname === '/' ||
    pathname?.startsWith('/account') ||
    pathname?.startsWith('/blog') ||
    pathname?.startsWith('/faq') ||
    pathname?.startsWith('/about')
  ) {
    return null
  }

  function openHelpWalkthrough() {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'help_opened', surface: 'navbar' }),
      keepalive: true,
    }).catch(() => undefined)
    window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))
  }

  const isResearchSurface =
    pathname?.startsWith('/dashboard') || pathname?.startsWith('/reports')
  const dashboardHref =
    isResearchSurface && currentQuery ? `/dashboard?${currentQuery}` : storedDashboardHref
  const reportsHref =
    isResearchSurface && currentQuery ? `/reports?${currentQuery}` : storedReportsHref
  const adminHref = pathname?.startsWith('/admin') && currentQuery
    ? `/admin?${currentQuery}`
    : storedAdminHref

  const accountStateLabel =
    user?.role === 'admin'
      ? 'Admin'
      : user?.accountType === 'paid'
        ? 'Paid'
        : user
          ? 'Trial'
          : null

  return (
    <header className="bs-nav-shell">
      <div className="bs-nav-container">
        <div className="bs-nav">
          <div className="flex min-w-0 flex-1 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <Link href="/" className="bs-nav-brand">
              <span className="bs-nav-brand-mark">
                <Image src="/brand-icon.png" alt="" width={44} height={44} className="rounded-2xl" priority />
              </span>
              <span className="bs-nav-brand-copy">
                <span className="bs-nav-brand-kicker">Backer Sonar</span>
                <span className="bs-nav-brand-title">Kickstarter Research</span>
              </span>
            </Link>

            <nav className="bs-nav-links">
              <Link
                href={dashboardHref}
                className={`bs-nav-link ${pathname?.startsWith('/dashboard') ? 'bs-nav-link-active' : ''}`}
              >
                User View
              </Link>
              <Link
                href={reportsHref}
                className={`bs-nav-link ${pathname?.startsWith('/reports') ? 'bs-nav-link-active' : ''}`}
              >
                Reporting View
              </Link>
              {showAiCopilot ? (
                <Link
                  href="/ai-copilot"
                  className={`bs-nav-link ${pathname?.startsWith('/ai-copilot') ? 'bs-nav-link-active' : ''}`}
                >
                  AI Co-Pilot
                </Link>
              ) : null}
              {user?.role === 'admin' ? <>
                <Link
                  href="/admin/quality/research"
                  className={`bs-nav-link ${pathname?.startsWith('/admin/quality/research') ? 'bs-nav-link-active' : ''}`}
                >
                  Research QA
                </Link>
                <details className="bs-nav-dropdown">
                  <summary
                    className={`bs-nav-link list-none ${pathname?.startsWith('/admin/users') || pathname?.startsWith('/admin/usage') || (pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/quality/research')) ? 'bs-nav-link-active' : ''}`}
                  >
                    Admin
                    <span aria-hidden="true" className="bs-nav-dropdown-chevron" />
                  </summary>
                  <div className="bs-nav-dropdown-menu">
                    <Link
                      href="/admin/users"
                      className={`bs-nav-dropdown-link ${pathname?.startsWith('/admin/users') ? 'bs-nav-dropdown-link-active' : ''}`}
                    >
                      Admin Users
                    </Link>
                    <Link
                      href="/admin/usage"
                      className={`bs-nav-dropdown-link ${pathname?.startsWith('/admin/usage') ? 'bs-nav-dropdown-link-active' : ''}`}
                    >
                      Admin Usage
                    </Link>
                    <Link
                      href={adminHref}
                      className={`bs-nav-dropdown-link ${pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/quality/research') && !pathname?.startsWith('/admin/users') && !pathname?.startsWith('/admin/usage') ? 'bs-nav-dropdown-link-active' : ''}`}
                    >
                      Admin View
                    </Link>
                  </div>
                </details>
              </> : null}
              <Link
                href="/account"
                className={`bs-nav-link ${pathname?.startsWith('/account') ? 'bs-nav-link-active' : ''}`}
              >
                Account
              </Link>
              {user ? (
                <button type="button" onClick={openHelpWalkthrough} className="bs-nav-link">
                  {onboardingStatus === 'completed' || onboardingStatus === 'skipped'
                    ? 'Restart walkthrough'
                    : 'Help'}
                </button>
              ) : null}
              {user ? (
                <form action={logoutAccount}>
                  <button type="submit" className="bs-nav-link">
                    Log out
                  </button>
                </form>
              ) : null}
            </nav>
            </div>

            {user ? (
              <div className="bs-nav-account">
                <span className="bs-nav-account-kicker">Signed in</span>
                <span className="bs-nav-account-name">{user.displayName}</span>
                <span className="bs-nav-account-plan">{accountStateLabel}</span>
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </header>
  )
}
