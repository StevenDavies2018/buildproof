import type { Metadata } from 'next'
import Link from 'next/link'
import { getFounderContent } from '@/lib/founder'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'About',
  description: 'The founder behind Backer Sonar.',
  ...pageMetadata('/about'),
}

export default async function AboutPage() {
  const founder = await getFounderContent()

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-4xl gap-5">
        <section className="bs-panel">
          <p className="bs-kicker">About</p>
          <h1 className="bs-title mt-3 text-4xl font-semibold">Who&rsquo;s behind Backer Sonar.</h1>
        </section>

        {founder ? (
          <section className="bs-panel p-5">
            <p className="bs-kicker">Founder</p>
            <h2 className="bs-title mt-2 text-2xl font-semibold">{founder.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {founder.title}
              {founder.location ? ` · ${founder.location}` : ''}
            </p>
            <div className="bs-article mt-4" dangerouslySetInnerHTML={{ __html: founder.contentHtml }} />
          </section>
        ) : null}

        <section className="bs-panel">
          <Link href="/" className="bs-button-secondary">Back to Backer Sonar</Link>
        </section>
      </div>
    </main>
  )
}
