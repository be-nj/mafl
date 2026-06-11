import type { CompleteConfig } from '~/types'

export default defineEventHandler(async (event) => {
  const storage = useStorage('main')
  const config = await storage.getItem<CompleteConfig>('config')

  if (!config) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Bad loading config',
    })
  }

  // extractSafelyConfig strips secret *values*; annotate each service with its
  // secret *key names* (positionally) so the editor can show write-only fields
  // without ever receiving the values (see ADR 0001).
  const safe = extractSafelyConfig(config)

  safe.services.forEach((group: any, gi: number) => {
    group.items.forEach((item: any, ii: number) => {
      const secrets = config.services[gi]?.items[ii]?.secrets

      if (secrets && Object.keys(secrets).length) {
        item.secretKeys = Object.keys(secrets)
      }
    })
  })

  // `mayEdit` reflects whether THIS request is Admin (depends on the token
  // header). The boot fetch carries no token, so it is false until the client
  // re-requests with a token via useAdmin().
  return {
    ...safe,
    mayEdit: isAdmin(event),
    configHash: await getRawConfigHash(),
  }
})
