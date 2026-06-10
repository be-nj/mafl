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
 * forward-auth Auth Provider.
 *
 * Trust a group header injected by a trusted upstream proxy (Authentik,
 * Authelia, oauth2-proxy, …). Admin iff the configured admin group appears
 * (split on the configured separator, exact match — never substring) in that
 * header. ONLY safe if the app is not reachable bypassing the proxy, otherwise
 * the header is forgeable (see ADR 0001).
 */
function isAdminByForwardAuth(event: H3Event): boolean {
  const { auth } = useRuntimeConfig(event)
  const { groupsHeader, groupsSeparator, adminGroup } = auth

  if (!adminGroup || !groupsHeader) {
    return false
  }

  const raw = getRequestHeader(event, groupsHeader)

  if (!raw) {
    return false
  }

  return raw
    .split(groupsSeparator || ',')
    .map((group) => group.trim())
    .includes(adminGroup)
}

/**
 * Token Auth Provider. Admin iff an admin token is configured
 * (`MAFL_ADMIN_TOKEN`) and the request carries the matching token.
 */
function isAdminByToken(event: H3Event): boolean {
  const { adminToken } = useRuntimeConfig(event)

  if (!adminToken) {
    return false
  }

  const provided = getRequestHeader(event, TOKEN_HEADER)

  return Boolean(provided) && tokensMatch(provided as string, adminToken as string)
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
