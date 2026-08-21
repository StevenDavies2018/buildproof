'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getViewStateKey } from '@/lib/view-state'

function buildPersistentQuery(searchString: string) {
  const params = new URLSearchParams(searchString)
  params.delete('account')
  return params.toString()
}

export default function ViewStatePersistence() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const currentPath = pathname ?? ''
    const key = getViewStateKey(currentPath)
    if (!key || !currentPath) return

    const query = buildPersistentQuery(
      typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, ''),
    )
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
  }, [pathname, router])

  return null
}
