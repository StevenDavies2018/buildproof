import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

const FOUNDER_FILE = path.join(process.cwd(), 'content', 'founder.md')

export type FounderContent = {
  name: string
  title: string
  location: string
  contentHtml: string
}

export async function getFounderContent(): Promise<FounderContent | null> {
  if (!fs.existsSync(FOUNDER_FILE)) return null

  const raw = fs.readFileSync(FOUNDER_FILE, 'utf8')
  const { data, content } = matter(raw)
  const processed = await remark().use(remarkGfm).use(remarkHtml).process(content)

  return {
    name: String(data.name ?? ''),
    title: String(data.title ?? ''),
    location: String(data.location ?? ''),
    contentHtml: processed.toString(),
  }
}
