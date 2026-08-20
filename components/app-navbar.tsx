'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AuthUser } from '@/lib/auth'
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

type ThemeMode = 'light' | 'dark'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = window.localStorage.getItem('backer-sonar-theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export default function AppNavbar({ user }: { user: AuthUser | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('not_started')
  const [storedAdminHref, setStoredAdminHref] = useState('/admin')
  const [storedDashboardHref, setStoredDashboardHref] = useState('/dashboard')
  const [storedReportsHref, setStoredReportsHref] = useState('/reports')

  useEffect(() => {
    const nextTheme = getInitialTheme()
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
  }, [])

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

  if (pathname === '/' || pathname?.startsWith('/account')) return null

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('backer-sonar-theme', nextTheme)
  }

  function openHelpWalkthrough() {
    window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))
  }

  const currentQuery = searchParams?.toString() ?? ''
  const isResearchSurface =
    pathname?.startsWith('/dashboard') || pathname?.startsWith('/reports')
  const dashboardHref =
    isResearchSurface && currentQuery ? `/dashboard?${currentQuery}` : storedDashboardHref
  const reportsHref =
    isResearchSurface && currentQuery ? `/reports?${currentQuery}` : storedReportsHref
  const adminHref = pathname?.startsWith('/admin') && currentQuery
    ? `/admin?${currentQuery}`
    : storedAdminHref

  return (
    <header className="bs-nav-shell">
      <div className="bs-container">
        <div className="bs-nav">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href="/" className="bs-nav-brand">
              <span className="bs-nav-brand-mark">BS</span>
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
                className={`bs-nav-link bs-nav-report-button ${pathname?.startsWith('/reports') ? 'bs-nav-report-button-active' : ''}`}
              >
                Reporting View
              </Link>
              {user?.role === 'admin' ? <>
                <Link
                  href="/admin/quality/research"
                  className={`bs-nav-link ${pathname?.startsWith('/admin/quality/research') ? 'bs-nav-link-active' : ''}`}
                >
                  Research QA
                </Link>
                <Link
                  href={adminHref}
                  className={`bs-nav-link ${pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/quality/research') ? 'bs-nav-link-active' : ''}`}
                >
                  Admin View
                </Link>
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
            </nav>
          </div>

          <button type="button" onClick={toggleTheme} className="bs-theme-toggle self-start md:self-auto">
            <span className="bs-theme-toggle-label">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span className="bs-theme-toggle-icon">
              {theme === 'dark' ? 'Sun' : 'Moon'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
