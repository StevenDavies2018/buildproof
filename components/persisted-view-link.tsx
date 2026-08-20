'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ADMIN_VIEW_STATE_KEY,
  DASHBOARD_VIEW_STATE_KEY,
  REPORTS_VIEW_STATE_KEY,
} from '@/lib/view-state'

const STORAGE_KEY_BY_VIEW = {
  dashboard: DASHBOARD_VIEW_STATE_KEY,
  reports: REPORTS_VIEW_STATE_KEY,
  admin: ADMIN_VIEW_STATE_KEY,
} as const

export function PersistedViewLink({
  view,
  fallbackHref,
  className,
  children,
}: {
  view: keyof typeof STORAGE_KEY_BY_VIEW
  fallbackHref: string
  className?: string
  children: React.ReactNode
}) {
  const [href, setHref] = useState(fallbackHref)

  useEffect(() => {
    try {
      const storedHref = window.localStorage.getItem(STORAGE_KEY_BY_VIEW[view])
      if (storedHref) {
        setHref(storedHref)
      }
    } catch {
      setHref(fallbackHref)
    }
  }, [fallbackHref, view])

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
