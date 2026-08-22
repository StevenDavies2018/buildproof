'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

// Layout effects don't run on the server; fall back to a no-op effect there
// so this stays safe to import from a component that's part of SSR output.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  // The blocking script in app/layout.tsx already sets this before hydration,
  // so reading it here (synchronously, before paint) avoids a flash of the
  // wrong label/icon for light-theme users.
  const current = document.documentElement.dataset.theme
  if (current === 'light' || current === 'dark') {
    return current
  }

  const stored = window.localStorage.getItem('backer-sonar-theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export default function ThemeToggle({ className = 'bs-theme-toggle' }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>('dark')

  useIsomorphicLayoutEffect(() => {
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
    <button type="button" onClick={toggleTheme} className={className}>
      <span className="bs-theme-toggle-label">
        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
      </span>
      <span className="bs-theme-toggle-icon">
        {theme === 'dark' ? 'Sun' : 'Moon'}
      </span>
    </button>
  )
}
