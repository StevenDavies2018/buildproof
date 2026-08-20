'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getViewStateKey } from '@/lib/view-state'

function buildPersistentQuery(searchParams: URLSearchParams | null) {
  const params = new URLSearchParams(searchParams?.toString() ?? '')
  params.delete('account')
  return params.toString()
}

export default function ViewStatePersistence() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const currentPath = pathname ?? ''
    const key = getViewStateKey(currentPath)
    if (!key || !currentPath) return

    const query = buildPersistentQuery(searchParams)
    const currentHref = query ? `${currentPath}?${query}` : currentPath

    try {
      if (query) {
        window.localStorage.setItem(key, currentHref)
        return
      }

      const storedHref = window.localStorage.getItem(key)
      if (
        storedHref &&
        storedHref !== currentHref &&
        storedHref.startsWith(`${currentPath}?`)
      ) {
        router.replace(storedHref, { scroll: false })
      }
    } catch {
      // Ignore storage failures and leave the current route unchanged.
    }
  }, [pathname, router, searchParams])

  return null
}
