import yaml from 'yaml'
import { ZodError } from 'zod'
import { configSchema } from '~/server/validations'

/**
 * Edit Ops. Targets are addressed positionally (group + index) against the raw
 * config, never by the ephemeral runtime id. Every op is validated against the
 * full schema and written atomically; structural ops share that pipeline.
 */
type EditOp =
  | { type: 'set-field', groupIndex: number | null, index: number, field: string, value: unknown }
  | { type: 'add-service', groupIndex: number | null }
  | { type: 'delete-service', groupIndex: number | null, index: number }
  | { type: 'add-group', title?: string }
  | { type: 'rename-group', groupIndex: number, title: string }
  | { type: 'delete-group', groupIndex: number }

interface OpEnvelope {
  baseHash?: string
}

const EDITABLE_FIELDS = new Set(['title', 'description', 'link'])

/**
 * The items array for a group, for both raw shapes: a flat list (one implicit
 * group) or a map of group title -> items (group order = key order).
 */
function groupItems(doc: Record<string, any>, groupIndex: number | null): Record<string, any>[] | undefined {
  const { services } = doc

  if (Array.isArray(services)) {
    return services
  }

  if (services && typeof services === 'object') {
    const keys = Object.keys(services)
    const key = groupIndex == null ? keys[0] : keys[groupIndex]

    return key == null ? undefined : services[key]
  }

  return undefined
}

function applyOp(doc: Record<string, any>, op: EditOp): void {
  if (op.type === 'add-group') {
    const { services } = doc

    if (Array.isArray(services) && services.length) {
      throw createError({ statusCode: 400, statusMessage: 'Config is a flat service list; groups are not used' })
    }

    const groups: Record<string, any> = (services && !Array.isArray(services)) ? services : {}
    let name = op.title?.trim() || 'New group'

    while (name in groups) {
      name += ' (1)'
    }

    groups[name] = []
    doc.services = groups

    return
  }

  if (op.type === 'rename-group' || op.type === 'delete-group') {
    const { services } = doc

    if (!services || typeof services !== 'object' || Array.isArray(services)) {
      throw createError({ statusCode: 400, statusMessage: 'No named groups' })
    }

    const keys = Object.keys(services)
    const oldKey = keys[op.groupIndex]

    if (oldKey == null) {
      throw createError({ statusCode: 404, statusMessage: 'Group not found' })
    }

    if (op.type === 'delete-group') {
      delete services[oldKey]

      return
    }

    // rename-group: rekey while preserving group order and contents.
    const newKey = op.title?.trim()

    if (!newKey) {
      throw createError({ statusCode: 400, statusMessage: 'Group title required' })
    }

    if (newKey !== oldKey && newKey in services) {
      throw createError({ statusCode: 409, statusMessage: 'A group with that title already exists' })
    }

    doc.services = keys.reduce<Record<string, any>>((acc, key) => {
      acc[key === oldKey ? newKey : key] = services[key]

      return acc
    }, {})

    return
  }

  const items = groupItems(doc, op.groupIndex)

  if (!items) {
    throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  }

  if (op.type === 'add-service') {
    items.push({ title: 'New service' })

    return
  }

  const target = items[op.index]

  if (!target || typeof target !== 'object') {
    throw createError({ statusCode: 404, statusMessage: 'Service not found at that position' })
  }

  if (op.type === 'delete-service') {
    items.splice(op.index, 1)

    return
  }

  // set-field
  if (!EDITABLE_FIELDS.has(op.field)) {
    throw createError({ statusCode: 400, statusMessage: 'Field not editable' })
  }

  target[op.field] = op.value
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody<EditOp & OpEnvelope>(event)

  if (!body || typeof body.type !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid edit op' })
  }

  const storage = useStorage('data')
  const raw = await storage.getItem<string>(configFileName)

  // Optimistic concurrency: reject if the file changed since the op was authored.
  if (body.baseHash && body.baseHash !== hashConfig(raw || '')) {
    throw createError({ statusCode: 409, statusMessage: 'Config changed, reload and retry' })
  }

  const doc = yaml.parse(raw || '') || {}

  applyOp(doc, body)

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
