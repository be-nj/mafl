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
  const mayEdit = useState('admin:mayEdit', () => false)
  const editMode = useState('admin:editMode', () => false)

  function getToken(): string {
    return import.meta.client ? localStorage.getItem(TOKEN_KEY) || '' : ''
  }

  function headers(): Record<string, string> {
    const token = getToken()

    return token ? { 'x-mafl-admin-token': token } : {}
  }

  async function verify(): Promise<boolean> {
    if (!getToken()) {
      mayEdit.value = false

      return false
    }

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

  async function saveField(op: FieldEditOp): Promise<void> {
    await $fetch('/api/config', {
      method: 'POST',
      headers: headers(),
      body: op,
    })
  }

  return { mayEdit, editMode, verify, enter, leave, saveField }
}
