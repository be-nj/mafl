# 0001 — Admin authorization via forward-auth headers or shared token

## Status
Accepted

## Context
Mafl has no authentication of any kind: no users, sessions, or passwords. The read path (`/api/settings`) is open by design — the app assumes it sits behind the operator's own network boundary. Adding inline editing introduces the **first** write path, which must be gated by "admin rights." There is no existing auth mechanism to build on.

The primary deployment already runs **Authentik as a forward-auth proxy** in front of the app. Other operators may use Authelia, oauth2-proxy, traefik-forward-auth, or no proxy at all.

## Decision
Authorization is a per-request, server-side check (`requireAdmin`) driven by config, with two providers:

- **`forward-auth`** — trust an identity header injected by the upstream proxy. Operator configures the header name (`groupsHeader`), a separator (`groupsSeparator`), and the admin group name (`adminGroup`). A request is Admin iff `adminGroup` appears (split-on-separator, **exact match**, never substring) in that header.
- **`token`** — a shared secret in the environment (`MAFL_ADMIN_TOKEN`), for deployments without a forward-auth proxy.

If **neither** is configured, no request is ever Admin and the editor is disabled — the app behaves exactly as it does today (read-only). This refuse-by-default posture is deliberate.

The app does **not** implement OIDC itself. Identity is delegated to the proxy; the app only reads the group claim the proxy forwards.

## Consequences
- Header names are fully configurable, so the feature is not Authentik-locked and could be upstreamed.
- **Trusting forward-auth headers is only safe if those headers cannot reach the app except through the proxy.** If the app's port is directly reachable, anyone can forge `groupsHeader` and become admin. Therefore `forward-auth` must be explicit opt-in, the app container must not be directly exposed, and the proxy should strip client-supplied copies of the header.
- No user model, no database, no session store — consistent with the app's stateless, config-only design.
- Identity is never sent to the client; the client learns only a single boolean ("you may edit").

## Alternatives considered
- **In-app OIDC** — full standalone OIDC client. Rejected: duplicates what the proxy already does; wrong layer when forward-auth is present.
- **Full auth (users/sessions/roles)** — rejected: disproportionate for a single-admin dashboard, breaks the no-state design.
- **Proxy-only, no app check** — rejected as the *only* mechanism: ships a fully open write API and relies on every operator to remember to gate it externally.
