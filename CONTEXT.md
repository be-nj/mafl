# Context — Mafl (be-nj fork)

Glossary of the domain language. Definitions only — no implementation detail, no decisions (those live in `docs/adr/`).

## Terms

### Service
A single entry on the dashboard: a card with at minimum a title, usually a link and icon. May carry a `type` that turns it into an interactive **Widget**. Identity in the config is **positional**, not an id — the runtime id is ephemeral (regenerated on every config load).

### Widget
A Service with a `type`, whose card fetches extra data from the backend (e.g. weather, IP). The data fetch happens server-side so third-party API keys stay off the client.

### Group
A named, ordered collection of Services. The dashboard is an ordered list of Groups. A config may instead be a single flat list of Services (one implicit untitled Group).

### Secret
A credential a Widget needs to call a third-party API (today: only the OpenWeatherMap `apiKey`). A Secret is **write-only from the client's perspective**: its value never appears in any response to the browser and never lives in client state. The client may learn only that a Secret is *present*, never its value.

### Admin
A request authorized to mutate the configuration. The app has no user accounts; "Admin" is determined per-request, server-side, by the configured **Auth Provider**. Not a stored entity — a property of a request.

### Auth Provider
The configured mechanism that decides whether a request is Admin. One of: `forward-auth` (trust an identity header injected by a trusted upstream proxy, matching a configured admin group) or `token` (a shared secret in the environment). When none is configured, no request is ever Admin and the **Editor** is off.

### Editor / Edit Mode
The Admin-only UI state in which Services and Groups can be changed in place. Off entirely unless an Auth Provider is configured and the request is Admin.

### Edit Op
A single intent sent from the Editor to the server (update a field, add/remove/move a Service or Group, set/clear a Secret). The client sends Ops, never a full configuration document — so it never has to hold data it is not allowed to see (Secrets).
