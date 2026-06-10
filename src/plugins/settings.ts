import type { CompleteConfig } from '~/types'

/**
 * Loads the dashboard config and keeps it reactive. On a `config:update` event
 * (file changed, or an inline edit saved) it refetches and mutates the provided
 * objects in place — no hard page reload — so the editor keeps focus, scroll
 * position and edit mode.
 */
export default defineNuxtPlugin(async () => {
  const { data } = await useFetch<CompleteConfig>('/api/settings', { headers: adminHeaders() })

  const initial = (data.value || {}) as any
  const { services: initialServices = [], ...initialSettings } = initial

  const services = reactive<any[]>([...initialServices])
  const settings = reactive<Record<string, any>>({ ...initialSettings })

  async function refreshConfig() {
    const fresh = await $fetch<any>('/api/settings', { headers: adminHeaders() })
    const { services: svc = [], ...rest } = fresh || {}

    services.splice(0, services.length, ...svc)

    for (const key of Object.keys(settings)) {
      if (!(key in rest)) {
        delete settings[key]
      }
    }

    Object.assign(settings, rest)
  }

  if (import.meta.client) {
    const { on } = useWebsocket()
    on('config:update', refreshConfig)
  }

  return {
    provide: { services, settings, refreshConfig },
  }
})
