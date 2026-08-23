import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  publishedAt: string
}

function readFrontmatter(slug: string, raw: string): BlogPostMeta {
  const { data } = matter(raw)
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    publishedAt: String(data.publishedAt ?? ''),
  }
}

export function getAllPostMeta(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readFrontmatter(file.replace(/\.md$/, ''), fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
}

export async function getPostBySlug(slug: string): Promise<{ meta: BlogPostMeta; contentHtml: string } | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { content } = matter(raw)
  const processed = await remark().use(remarkGfm).use(remarkHtml).process(content)

  return {
    meta: readFrontmatter(slug, raw),
    contentHtml: processed.toString(),
  }
}
