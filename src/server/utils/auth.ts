import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const TOKEN_HEADER = 'x-mafl-admin-token'

function tokensMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)

  if (ab.length !== bb.length) {
    return false
  }

  return timingSafeEqual(ab, bb)
}

/**
 * Token Auth Provider.
 *
 * A request is Admin iff an admin token is configured (`MAFL_ADMIN_TOKEN`)
 * and the request carries the matching token. With no token configured no
 * request is ever Admin (refuse-by-default) — the inline editor stays off and
 * the app behaves read-only, exactly as without this feature.
 */
export function isAdmin(event: H3Event): boolean {
  const { adminToken } = useRuntimeConfig(event)

  if (!adminToken) {
    return false
  }

  const provided = getRequestHeader(event, TOKEN_HEADER)

  return Boolean(provided) && tokensMatch(provided as string, adminToken as string)
}

export function requireAdmin(event: H3Event): void {
  if (!isAdmin(event)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin authorization required',
    })
  }
}
