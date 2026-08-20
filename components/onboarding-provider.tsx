'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AuthUser } from '@/lib/auth'
import {
  getOnboardingStorageKey,
  loadAccountOnboardingStatus,
  ONBOARDING_OPEN_EVENT,
  ONBOARDING_SAMPLE_QUERY,
  ONBOARDING_STATUS_CHANGED_EVENT,
  ONBOARDING_STEPS,
  saveAccountOnboardingStatus,
  type OnboardingStatus,
} from '@/lib/onboarding'

function readStatus(userId: number): OnboardingStatus {
  try {
    const stored = window.localStorage.getItem(getOnboardingStorageKey(userId))
    return stored === 'skipped' || stored === 'completed' ? stored : 'not_started'
  } catch {
    return 'not_started'
  }
}

function writeStatus(userId: number, status: OnboardingStatus) {
  try {
    window.localStorage.setItem(getOnboardingStorageKey(userId), status)
    window.dispatchEvent(new CustomEvent(ONBOARDING_STATUS_CHANGED_EVENT, { detail: { userId, status } }))
  } catch {
    // Best-effort local persistence for the POC.
  }
}

export default function OnboardingProvider({ user }: { user: AuthUser | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<OnboardingStatus>('not_started')
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [completionState, setCompletionState] = useState<'idle' | 'finishing'>('idle')
  const lastScrolledTargetRef = useRef<string | null>(null)
  const [dockRect, setDockRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const [targetRect, setTargetRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  const eligible = Boolean(user) && pathname?.startsWith('/dashboard')
  const activeStep = ONBOARDING_STEPS[stepIndex]
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1
  const hasMeaningfulFilters = Boolean(
    searchParams?.get('search') ||
    searchParams?.get('categoryParent') ||
    searchParams?.get('categorySlug') ||
    searchParams?.get('taxonomyLabel') ||
    searchParams?.get('durationBucket') ||
    searchParams?.get('rawState') ||
    searchParams?.get('minGoal') ||
    searchParams?.get('minPledged') ||
    searchParams?.get('years'),
  )

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setStatus('not_started')
      setOpen(false)
      setStepIndex(0)
      return
    }

    const localStatus = readStatus(user.id)
    setStatus(localStatus)

    if (pathname?.startsWith('/dashboard') && localStatus === 'not_started') {
      setStepIndex(0)
      setOpen(true)
    } else {
      setOpen(false)
    }

    loadAccountOnboardingStatus().then((accountState) => {
      if (cancelled || !user) return
      const nextStatus = accountState.authenticated ? accountState.status : localStatus
      setStatus(nextStatus)
      writeStatus(user.id, nextStatus)

      if (pathname?.startsWith('/dashboard') && nextStatus === 'not_started') {
        setStepIndex(0)
        setOpen(true)
      } else if (nextStatus !== 'not_started') {
        setOpen(false)
      }
    }).catch(() => {
      // Keep local fallback behavior for the POC.
    })

    return () => {
      cancelled = true
    }
  }, [pathname, user])

  useEffect(() => {
    function handleOpen() {
      if (!eligible || !user) return
      if (!hasMeaningfulFilters) {
        const params = new URLSearchParams(searchParams?.toString() ?? '')
        for (const [key, value] of Object.entries(ONBOARDING_SAMPLE_QUERY)) {
          params.set(key, value)
        }
        router.replace(`/dashboard?${params.toString()}`, { scroll: false })
      }
      setCompletionState('idle')
      setStepIndex(0)
      setOpen(true)
    }

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
  }, [eligible, hasMeaningfulFilters, router, searchParams, user])

  useEffect(() => {
    if (!open || !eligible || hasMeaningfulFilters) return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [key, value] of Object.entries(ONBOARDING_SAMPLE_QUERY)) {
      params.set(key, value)
    }
    router.replace(`/dashboard?${params.toString()}`, { scroll: false })
  }, [eligible, hasMeaningfulFilters, open, router, searchParams])

  const progressLabel = useMemo(
    () => `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`,
    [stepIndex],
  )
  const isDockedDesktop =
    typeof window !== 'undefined' && window.innerWidth >= 1280 && Boolean(dockRect)
  const panelStyle = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        width: 'min(52rem, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 48px)',
      }
    }

    if (window.innerWidth >= 1280 && dockRect) {
      const top = dockRect.top + dockRect.height + 16
      const availableHeight = Math.max(240, window.innerHeight - top - 24)

      return {
        left: `${dockRect.left}px`,
        top: `${top}px`,
        width: `${dockRect.width}px`,
        maxHeight: `${availableHeight}px`,
      }
    }

    if (!targetRect) {
      return {
        width: 'min(52rem, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 48px)',
      }
    }

    const panelWidth = Math.min(560, window.innerWidth - 48)
    const horizontalGap = 32
    const targetCenterX = targetRect.left + targetRect.width / 2
    const placeLeft = targetCenterX >= window.innerWidth / 2
    const top = 112

    if (window.innerWidth < 1024) {
      return {
        left: '24px',
        right: '24px',
        bottom: '24px',
        top: 'auto',
        width: 'auto',
        maxHeight: 'calc(100vh - 48px)',
      }
    }

    return placeLeft
      ? {
          left: `${horizontalGap}px`,
          top: `${top}px`,
          width: `${panelWidth}px`,
          maxHeight: 'calc(100vh - 136px)',
        }
      : {
          right: `${horizontalGap}px`,
          top: `${top}px`,
          width: `${panelWidth}px`,
          maxHeight: 'calc(100vh - 136px)',
        }
  }, [dockRect, targetRect])

  useEffect(() => {
    if (!open || !activeStep?.targetId) {
      setDockRect(null)
      setTargetRect(null)
      lastScrolledTargetRef.current = null
      return
    }

    function syncTarget() {
      const dockElement = document.getElementById('onboarding-target-saved-research')
      const element = document.getElementById(activeStep.targetId ?? '')
      if (dockElement) {
        const dockBounds = dockElement.getBoundingClientRect()
        setDockRect({
          top: dockBounds.top,
          left: dockBounds.left,
          width: dockBounds.width,
          height: dockBounds.height,
        })
      } else {
        setDockRect(null)
      }

      if (!element) {
        setTargetRect(null)
        return
      }

      if (lastScrolledTargetRef.current !== activeStep.targetId) {
        const top = element.getBoundingClientRect().top + window.scrollY - 132
        window.scrollTo({
          top: Math.max(0, top),
          behavior: 'smooth',
        })
        lastScrolledTargetRef.current = activeStep.targetId ?? null
      }

      const rect = element.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    const frame = window.requestAnimationFrame(syncTarget)
    window.addEventListener('resize', syncTarget)
    window.addEventListener('scroll', syncTarget, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', syncTarget)
      window.removeEventListener('scroll', syncTarget, true)
    }
  }, [activeStep?.targetId, open])

  if (!eligible || !open || !activeStep) return null

  function skip() {
    if (!user) return
    writeStatus(user.id, 'skipped')
    void saveAccountOnboardingStatus('skipped', activeStep.id)
    setStatus('skipped')
    setCompletionState('idle')
    setOpen(false)
    setStepIndex(0)
  }

  function back() {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  function next() {
    if (!user) return
    if (isLastStep) {
      setCompletionState('finishing')
      writeStatus(user.id, 'completed')
      void saveAccountOnboardingStatus('completed', activeStep.id)
      setStatus('completed')
      window.setTimeout(() => {
        setCompletionState('idle')
        setOpen(false)
        setStepIndex(0)
      }, 1200)
      return
    }
    setStepIndex((current) => Math.min(ONBOARDING_STEPS.length - 1, current + 1))
  }

  return (
    <div
      className={`bs-onboarding-shell ${isDockedDesktop ? 'pointer-events-none items-start justify-end p-0' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bs-onboarding-title"
    >
      <div className={`bs-onboarding-backdrop ${isDockedDesktop ? 'bg-transparent' : ''}`} />
      {targetRect && !isDockedDesktop ? (
        <div
          className="bs-onboarding-spotlight"
          style={{
            top: `${targetRect.top - 8}px`,
            left: `${targetRect.left - 8}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div className={`bs-onboarding-panel ${isDockedDesktop ? 'pointer-events-auto' : ''}`} style={panelStyle}>
        <div className="flex items-center justify-between gap-4">
          <p className="bs-kicker">{progressLabel}</p>
          <button type="button" onClick={skip} className="bs-button-secondary">
            Skip
          </button>
        </div>

        <h2 id="bs-onboarding-title" className="bs-title mt-4 text-3xl font-semibold">
          {activeStep.title}
        </h2>
        <p className="bs-copy mt-4">{activeStep.body}</p>

        <div className="mt-5 grid gap-3">
          {activeStep.bullets.map((bullet) => (
            <div key={bullet} className="bs-onboarding-bullet">
              <span className="bs-onboarding-bullet-dot" aria-hidden="true" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        {activeStep.note ? (
          <div className="bs-onboarding-note mt-5">
            {activeStep.note}
          </div>
        ) : null}

        {isLastStep ? (
          <div className="mt-5 rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
            Finishing this walkthrough saves your progress. You can reopen it anytime from the nav with
            {' '}<span className="font-semibold text-white">Restart walkthrough</span>.
          </div>
        ) : null}

        {completionState === 'finishing' ? (
          <div className="mt-5 rounded-[1rem] border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm font-medium leading-6 text-sky-100">
            Walkthrough completed. You can reopen it anytime from the nav.
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="h-2 w-full max-w-[10rem] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-300"
              style={{ width: `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={back} className="bs-button-secondary" disabled={stepIndex === 0}>
              Back
            </button>
            <button type="button" onClick={next} className="bs-button-primary">
              {completionState === 'finishing' ? 'Saved' : activeStep.primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
