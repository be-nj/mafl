import type { CompleteConfig } from '~/types'

const TOKEN_KEY = 'mafl-admin-token'

export interface FieldEditOp {
  groupIndex: number | null
  index: number
  field: string
  value: unknown
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
  // Shared drag source for native HTML5 drag-and-drop reordering.
  const dragSource = useState<{ kind: 'service' | 'group', groupIndex: number | null, index: number } | null>('admin:drag', () => null)

  function getToken(): string {
    return import.meta.client ? localStorage.getItem(TOKEN_KEY) || '' : ''
  }

  function headers(): Record<string, string> {
    const token = getToken()

    return token ? { 'x-mafl-admin-token': token } : {}
  }

  async function verify(): Promise<boolean> {
    // Always ask the server — a forward-auth admin is identified by a proxy
    // header (no token), so we cannot short-circuit on a missing local token.
    try {
      const res = await $fetch<CompleteConfig & { mayEdit?: boolean }>('/api/settings', {
        headers: headers(),
      })

      mayEdit.value = Boolean(res?.mayEdit)
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

  async function sendOp(op: Record<string, unknown>): Promise<void> {
    const baseHash = (nuxtApp.$settings as { configHash?: string })?.configHash

    try {
      await $fetch('/api/config', {
        method: 'POST',
        headers: headers(),
        body: { ...op, baseHash },
      })
    } catch (e) {
      // Stale base (409): the file changed under us — reload to the new state.
      if ((e as { statusCode?: number, response?: { status?: number } })?.statusCode === 409
        || (e as { response?: { status?: number } })?.response?.status === 409) {
        reloadNuxtApp({ force: true })
      }

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
    return sendOp({ type: 'move-service', fromGroup, fromIndex, toGroup, toIndex })
  }

  function moveGroup(fromIndex: number, toIndex: number): Promise<void> {
    return sendOp({ type: 'move-group', fromIndex, toIndex })
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
    dragSource,
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
