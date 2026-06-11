import type { CompleteConfig } from '~/types'

const TOKEN_KEY = 'mafl-admin-token'

export interface FieldEditOp {
  groupIndex: number | null
  index: number
  field: string
  value: unknown
}

/**
 * Admin token header for outbound requests. The token lives in localStorage
 * and is only ever sent, never received. Module-level so the config plugin can
 * reuse it when reactively refetching settings.
 */
export function adminHeaders(): Record<string, string> {
  const token = import.meta.client ? localStorage.getItem(TOKEN_KEY) || '' : ''

  return token ? { 'x-mafl-admin-token': token } : {}
}

/**
 * Client-side Admin state for the inline editor.
 *
 * The admin token lives in localStorage and is only ever SENT (as a header),
 * never received — identity stays server-side. `mayEdit` is a single boolean
 * the server hands back; `editMode` is the local view/edit toggle.
 */
export function useAdmin() {
  const nuxtApp = useNuxtApp()
  const mayEdit = useState('admin:mayEdit', () => false)
  const editMode = useState('admin:editMode', () => false)
  // Id of the single currently-open card popover (icon picker or settings), so
  // only one is ever open at a time across all cards.
  const openPopover = useState<string | null>('admin:openPopover', () => null)

  const headers = adminHeaders
  const lastHash = useState<string>('config:lastHash', () => '')

  // Reactively refetch the dashboard config (provided by the settings plugin)
  // instead of doing a hard page reload, so editing keeps focus/scroll/mode.
  // Resetting lastHash first bypasses the self-edit dedup to force a real fetch.
  function refresh(): void | Promise<void> {
    lastHash.value = ''

    return (nuxtApp.$refreshConfig as (() => Promise<void>) | undefined)?.()
  }

  // Apply an op to the local reactive config immediately, so the UI responds
  // instantly; the server write + watcher reconcile in the background.
  function applyLocal(op: any): void {
    const services = nuxtApp.$services as any[] | undefined

    if (!services) {
      return
    }

    const gi = (op.groupIndex ?? 0) as number
    const group = services[gi]
    const item = group?.items?.[op.index]

    switch (op.type) {
      case 'set-field':
        if (item) {
          item[op.field] = op.value
        }
        break
      case 'set-tags':
        if (item) {
          item.tags = (op.tags as string[]).map((name) => ({ name, color: 'blue' }))
        }
        break
      case 'set-status':
        if (item) {
          item.status = { ...(item.status || {}), ...op.status }
        }
        break
      case 'set-icon':
        if (item) {
          const icon: Record<string, unknown> = { ...(item.icon || {}) }
          for (const [key, value] of Object.entries(op.icon as Record<string, unknown>)) {
            if (value === '' || value == null) {
              delete icon[key]
            } else {
              icon[key] = value
            }
          }
          item.icon = Object.keys(icon).length ? icon : undefined
        }
        break
      case 'add-service':
        group?.items?.push({ id: `tmp-${Date.now()}`, title: 'New service', tags: [] })
        break
      case 'delete-service':
        group?.items?.splice(op.index, 1)
        break
      case 'move-service': {
        const from = services[(op.fromGroup ?? 0) as number]?.items
        const to = services[(op.toGroup ?? 0) as number]?.items
        if (from && to) {
          const [moved] = from.splice(op.fromIndex, 1)
          to.splice(Math.max(0, Math.min(op.toIndex, to.length)), 0, moved)
        }
        break
      }
      case 'add-group':
        services.push({ title: 'New group', items: [] })
        break
      case 'rename-group':
        if (group) {
          group.title = op.title
        }
        break
      case 'delete-group':
        services.splice(gi, 1)
        break
      case 'move-group': {
        const [moved] = services.splice(op.fromIndex, 1)
        services.splice(op.toIndex, 0, moved)
        break
      }
    }
  }

  async function verify(): Promise<boolean> {
    // Always ask the server — a forward-auth admin is identified by a proxy
    // header (no token), so we cannot short-circuit on a missing local token.
    try {
      const res = await $fetch<CompleteConfig & { mayEdit?: boolean }>('/api/settings', {
        headers: headers(),
      })

      mayEdit.value = Boolean(res?.mayEdit)

      // Refetch with the token so secret presence + admin-only data populate.
      if (mayEdit.value) {
        await refresh()
      }
    } catch {
      mayEdit.value = false
    }

    return mayEdit.value
  }

  async function enter(token: string): Promise<boolean> {
    if (import.meta.client) {
      localStorage.setItem(TOKEN_KEY, token)
    }

    const ok = await verify()

    if (ok) {
      editMode.value = true
    }

    return ok
  }

  function leave(): void {
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY)
    }

    mayEdit.value = false
    editMode.value = false
  }

  async function sendOp(op: Record<string, unknown>, skipLocal = false): Promise<void> {
    const settings = nuxtApp.$settings as { configHash?: string } | undefined
    const baseHash = settings?.configHash

    // skipLocal: the caller already mutated local state (e.g. vuedraggable on a
    // drag). Otherwise apply optimistically so the UI updates instantly.
    if (!skipLocal) {
      applyLocal(op)
    }

    try {
      const res = await $fetch<{ hash?: string }>('/api/config', {
        method: 'POST',
        headers: headers(),
        body: { ...op, baseHash },
      })

      // Mark our own change so the watcher's config:update refetch is skipped,
      // and keep configHash current for the next op's baseHash.
      if (res?.hash) {
        lastHash.value = res.hash

        if (settings) {
          settings.configHash = res.hash
        }
      }
    } catch (e) {
      // The optimistic change didn't persist (validation, 409, network) —
      // revert to server truth.
      await refresh()
      throw e
    }
  }

  function saveField(op: FieldEditOp): Promise<void> {
    return sendOp({ type: 'set-field', ...op })
  }

  function setTags(groupIndex: number | null, index: number, tags: string[]): Promise<void> {
    return sendOp({ type: 'set-tags', groupIndex, index, tags })
  }

  function setStatus(groupIndex: number | null, index: number, status: Record<string, unknown>): Promise<void> {
    return sendOp({ type: 'set-status', groupIndex, index, status })
  }

  function setIcon(groupIndex: number | null, index: number, icon: Record<string, unknown>): Promise<void> {
    return sendOp({ type: 'set-icon', groupIndex, index, icon })
  }

  function setSecret(groupIndex: number | null, index: number, key: string, value: string): Promise<void> {
    return sendOp({ type: 'set-secret', groupIndex, index, key, value })
  }

  async function uploadIcon(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)

    const res = await $fetch<{ url: string }>('/api/icons', {
      method: 'POST',
      headers: headers(),
      body: form,
    })

    return res.url
  }

  function addService(groupIndex: number | null): Promise<void> {
    return sendOp({ type: 'add-service', groupIndex })
  }

  function deleteService(groupIndex: number | null, index: number): Promise<void> {
    return sendOp({ type: 'delete-service', groupIndex, index })
  }

  function moveService(fromGroup: number | null, fromIndex: number, toGroup: number | null, toIndex: number): Promise<void> {
    return sendOp({ type: 'move-service', fromGroup, fromIndex, toGroup, toIndex }, true)
  }

  function moveGroup(fromIndex: number, toIndex: number): Promise<void> {
    return sendOp({ type: 'move-group', fromIndex, toIndex }, true)
  }

  function deleteGroup(groupIndex: number): Promise<void> {
    return sendOp({ type: 'delete-group', groupIndex })
  }

  function addGroup(): Promise<void> {
    return sendOp({ type: 'add-group' })
  }

  function renameGroup(groupIndex: number, title: string): Promise<void> {
    return sendOp({ type: 'rename-group', groupIndex, title })
  }

  return {
    mayEdit,
    editMode,
    openPopover,
    verify,
    enter,
    leave,
    saveField,
    setTags,
    setStatus,
    setIcon,
    setSecret,
    uploadIcon,
    addService,
    deleteService,
    moveService,
    deleteGroup,
    addGroup,
    renameGroup,
    moveGroup,
  }
}
