'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function sendToGA4(metric: Metric) {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_rating: metric.rating,
  })
}

// Core Web Vitals aren't tracked by GA4 out of the box — this reports them
// as custom events so we get real per-page, real-visitor LCP/INP/CLS data
// without a paid third-party tool.
export function WebVitalsReporter() {
  useEffect(() => {
    onCLS(sendToGA4)
    onINP(sendToGA4)
    onLCP(sendToGA4)
  }, [])

  return null
}
