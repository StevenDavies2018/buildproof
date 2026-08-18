'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

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

export default function AppNavbar() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<ThemeMode>('dark')

  useEffect(() => {
    const nextTheme = getInitialTheme()
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
  }, [])

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('backer-sonar-theme', nextTheme)
  }

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
                href="/"
                className={`bs-nav-link ${pathname === '/' ? 'bs-nav-link-active' : ''}`}
              >
                User View
              </Link>
              <Link
                href="/reports"
                className={`bs-nav-link bs-nav-report-button ${pathname?.startsWith('/reports') ? 'bs-nav-report-button-active' : ''}`}
              >
                Reporting View
              </Link>
              <Link
                href="/admin"
                className={`bs-nav-link ${pathname?.startsWith('/admin') ? 'bs-nav-link-active' : ''}`}
              >
                Admin View
              </Link>
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
