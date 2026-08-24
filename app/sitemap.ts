import type { MetadataRoute } from 'next'
import { getAllPostMeta } from '@/lib/blog'

const BASE_URL = 'https://www.backersonar.com'

const PUBLIC_PATHS = [
  '/',
  '/faq',
  '/blog',
  '/about',
  '/terms',
  '/privacy',
  '/cookies',
  '/acceptable-use',
  '/accessibility',
  '/legal-disclaimer',
  '/account',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = PUBLIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }))

  const postEntries = getAllPostMeta().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt || Date.now()),
  }))

  return [...staticEntries, ...postEntries]
}
