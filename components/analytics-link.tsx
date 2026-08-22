'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import type { AnalyticsEventName } from '@/lib/analytics'
import { postAnalyticsEvent } from '@/lib/client-analytics'

type AnalyticsLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string
  eventName?: AnalyticsEventName
  surface?: string
  metadata?: Record<string, unknown>
}

export function AnalyticsLink({
  href,
  eventName,
  surface,
  metadata,
  onClick,
  children,
  ...props
}: AnalyticsLinkProps) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        if (eventName && surface) {
          postAnalyticsEvent(eventName, surface, metadata)
        }
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}
