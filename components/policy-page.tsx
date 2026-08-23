import Link from 'next/link'

export function PolicyPage({
  title,
  label,
  lastUpdated,
  children,
}: {
  title: string
  label: string
  lastUpdated: string
  children: React.ReactNode
}) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(lastUpdated))

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-4xl">
        <article className="bs-panel">
          <p className="bs-kicker">{label}</p>
          <h1 className="bs-title mt-3 text-4xl font-semibold">{title}</h1>
          <p className="mt-2 text-xs text-slate-500">Last updated {formattedDate}</p>
          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">{children}</div>
          <Link href="/" className="bs-button-secondary mt-8 inline-flex">Back to Backer Sonar</Link>
        </article>
      </div>
    </main>
  )
}
