'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { AuthUser } from '@/lib/auth'
import {
  getOnboardingStorageKey,
  loadAccountOnboardingStatus,
  ONBOARDING_OPEN_EVENT,
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
  const [status, setStatus] = useState<OnboardingStatus>('not_started')
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const eligible = Boolean(user) && pathname?.startsWith('/dashboard')
  const activeStep = ONBOARDING_STEPS[stepIndex]
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1

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
      setStepIndex(0)
      setOpen(true)
    }

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
  }, [eligible, user])

  const progressLabel = useMemo(
    () => `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`,
    [stepIndex],
  )

  if (!eligible || !open || !activeStep) return null

  function skip() {
    if (!user) return
    writeStatus(user.id, 'skipped')
    void saveAccountOnboardingStatus('skipped', activeStep.id)
    setStatus('skipped')
    setOpen(false)
    setStepIndex(0)
  }

  function back() {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  function next() {
    if (!user) return
    if (isLastStep) {
      writeStatus(user.id, 'completed')
      void saveAccountOnboardingStatus('completed', activeStep.id)
      setStatus('completed')
      setOpen(false)
      setStepIndex(0)
      return
    }
    setStepIndex((current) => Math.min(ONBOARDING_STEPS.length - 1, current + 1))
  }

  return (
    <div className="bs-onboarding-shell" role="dialog" aria-modal="true" aria-labelledby="bs-onboarding-title">
      <div className="bs-onboarding-backdrop" />
      <div className="bs-onboarding-panel">
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
              {activeStep.primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
