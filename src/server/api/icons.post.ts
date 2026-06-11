import { access, mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import process from 'node:process'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'])
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

/**
 * Admin-only icon upload. Writes the image into the icons volume that the
 * `/icons/**` route (PR #190) serves; the config only ever stores the small
 * `/icons/<name>` path, never the bytes (see ADR 0003).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const form = await readMultipartFormData(event)
  const file = form?.find((part) => part.name === 'file' && part.filename)

  if (!file || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const ext = extname(file.filename).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported file type' })
  }

  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 413, statusMessage: 'File too large' })
  }

  const dir = join(process.cwd(), 'public', 'icons')
  await mkdir(dir, { recursive: true })

  const safe = basename(file.filename).replace(/[^\w.-]/g, '_')
  let name = safe
  let n = 1

  while (await exists(join(dir, name))) {
    name = `${safe.slice(0, -ext.length)}-${n}${ext}`
    n++
  }

  await writeFile(join(dir, name), file.data)

  return { url: `/icons/${name}` }
})
