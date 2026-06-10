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

  // `mayEdit` reflects whether THIS request is Admin (depends on the token
  // header). The boot fetch carries no token, so it is false until the client
  // re-requests with a token via useAdmin().
  return {
    ...extractSafelyConfig(config),
    mayEdit: isAdmin(event),
    configHash: await getRawConfigHash(),
  }
})
