import yaml from 'yaml'
import { ZodError } from 'zod'
import { configSchema } from '~/server/validations'

/**
 * A single field-update Edit Op. The target service is addressed positionally
 * (group + index) against the raw config, never by the ephemeral runtime id.
 * This is the foundational op the rest of the editor builds on.
 */
interface FieldEditOp {
  groupIndex: number | null
  index: number
  field: string
  value: unknown
  baseHash?: string
}

const EDITABLE_FIELDS = new Set(['title', 'description', 'link'])

/**
 * Resolve a service by position in the raw (parsed-but-not-normalized) config.
 * The raw `services` is either a flat array (one implicit group) or a map of
 * group title -> items; group order is the map's key order.
 */
function locateService(
  doc: Record<string, any>,
  groupIndex: number | null,
  index: number,
): Record<string, any> | undefined {
  const { services } = doc

  if (Array.isArray(services)) {
    return services[index]
  }

  if (services && typeof services === 'object') {
    const keys = Object.keys(services)
    const key = groupIndex == null ? keys[0] : keys[groupIndex]
    const group = key == null ? undefined : services[key]

    return Array.isArray(group) ? group[index] : undefined
  }

  return undefined
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody<FieldEditOp>(event)

  if (!body || typeof body.index !== 'number' || !EDITABLE_FIELDS.has(body.field)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid edit op' })
  }

  const storage = useStorage('data')
  const raw = await storage.getItem<string>(configFileName)

  // Optimistic concurrency: reject if the file changed since the op was authored.
  if (body.baseHash && body.baseHash !== hashConfig(raw || '')) {
    throw createError({ statusCode: 409, statusMessage: 'Config changed, reload and retry' })
  }

  const doc = yaml.parse(raw || '') || {}

  const target = locateService(doc, body.groupIndex ?? null, body.index)

  if (!target || typeof target !== 'object') {
    throw createError({ statusCode: 404, statusMessage: 'Service not found at that position' })
  }

  target[body.field] = body.value

  // Gate: the file must never become a config that fails the schema. Unlike the
  // lenient boot path (which degrades to defaults + error banner), a save rejects.
  try {
    configSchema.parse(doc)
  } catch (e) {
    if (e instanceof ZodError) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Config validation failed',
        data: e.format(),
      })
    }

    throw e
  }

  await writeConfigFile(yaml.stringify(doc))

  return { ok: true }
})
