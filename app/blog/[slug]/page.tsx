import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPostMeta, getPostBySlug } from '@/lib/blog'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return getAllPostMeta().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.meta.title,
    description: post.meta.description,
    ...pageMetadata(`/blog/${slug}`),
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-3xl">
        <article className="bs-panel">
          <p className="bs-kicker">Blog</p>
          <h1 className="bs-title mt-3 text-3xl font-semibold md:text-4xl">{post.meta.title}</h1>
          <p className="mt-2 text-xs text-slate-500">Published {formatDate(post.meta.publishedAt)}</p>
          <div className="bs-article" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          <Link href="/blog" className="bs-button-secondary mt-8 inline-flex">Back to Blog</Link>
        </article>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.meta.title,
            description: post.meta.description,
            image: ['https://www.backersonar.com/opengraph-image'],
            datePublished: post.meta.publishedAt,
            author: { '@type': 'Organization', name: 'Backer Sonar' },
            publisher: {
              '@type': 'Organization',
              name: 'Backer Sonar',
              logo: {
                '@type': 'ImageObject',
                url: 'https://www.backersonar.com/brand-icon.png',
                width: 240,
                height: 240,
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://www.backersonar.com/blog/${slug}`,
            },
          }),
        }}
      />
    </main>
  )
}
