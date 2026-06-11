import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import process from 'node:process'
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
 * forward-auth Auth Provider.
 *
 * Trust a group header injected by a trusted upstream proxy (Authentik,
 * Authelia, oauth2-proxy, …). Admin iff the configured admin group appears
 * (split on the configured separator, exact match — never substring) in that
 * header. ONLY safe if the app is not reachable bypassing the proxy, otherwise
 * the header is forgeable (see ADR 0001).
 */
function isAdminByForwardAuth(event: H3Event): boolean {
  // Read at runtime (not via runtimeConfig): nuxt.config's process.env is
  // evaluated at build time, so the container's env wouldn't take effect.
  const groupsHeader = process.env.MAFL_AUTH_GROUPS_HEADER || ''
  const adminGroup = process.env.MAFL_AUTH_ADMIN_GROUP || ''
  const separator = process.env.MAFL_AUTH_GROUPS_SEPARATOR || ','

  if (!adminGroup || !groupsHeader) {
    return false
  }

  const raw = getRequestHeader(event, groupsHeader)

  if (!raw) {
    return false
  }

  return raw
    .split(separator)
    .map((group) => group.trim())
    .includes(adminGroup)
}

/**
 * Token Auth Provider. Admin iff an admin token is configured
 * (`MAFL_ADMIN_TOKEN`) and the request carries the matching token.
 */
function isAdminByToken(event: H3Event): boolean {
  const adminToken = process.env.MAFL_ADMIN_TOKEN || ''

  if (!adminToken) {
    return false
  }

  const provided = getRequestHeader(event, TOKEN_HEADER)

  return Boolean(provided) && tokensMatch(provided as string, adminToken)
}

/**
 * A request is Admin if any configured Auth Provider grants it. With none
 * configured no request is ever Admin (refuse-by-default) — the inline editor
 * stays off and the app behaves read-only, exactly as without this feature.
 */
export function isAdmin(event: H3Event): boolean {
  return isAdminByForwardAuth(event) || isAdminByToken(event)
}

export function requireAdmin(event: H3Event): void {
  if (!isAdmin(event)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin authorization required',
    })
  }
}
