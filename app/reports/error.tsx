'use client'

import Link from 'next/link'

export default function ReportsError({ reset }: { reset: () => void }) {
  return (
    <main className="bs-shell">
      <div className="bs-container">
        <section className="bs-panel">
          <p className="bs-kicker">Reporting View</p>
          <h1 className="bs-title mt-3 text-4xl font-semibold">
            The report connection was interrupted
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            The materialized report data is still available. Retry the request to reconnect to the reporting database.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="bs-button-primary">
              Retry report
            </button>
            <Link href="/reports" className="bs-button-secondary">
              Open reporting overview
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
