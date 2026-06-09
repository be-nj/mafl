# 0002 — Configuration write model: ops, positional addressing, optimistic concurrency

## Status
Accepted

## Context
Inline editing introduces the first write path to `config.yml`. Several forces constrain it:

- `config.yml` has **no service ids**; the runtime mints `crypto.randomUUID()` per service on every load, so runtime ids are ephemeral and cannot address a persistent edit target.
- The file is **hand-edited** and **git-tracked** by the operator, and this is a fork intended to be retired once its PRs merge upstream — so the file format must stay byte-compatible with upstream and friendly to humans.
- `secrets` are stripped from the config before it ever reaches the client (`extractSafelyConfig`), so the client cannot hold a faithful full copy of the config.
- A file watcher already reloads config and pushes a `config:update` event to all clients on any change to the file.

## Decision
1. **Edit Ops, not full-document PUT.** The client sends granular ops (update field, add/remove/move service or group, set/clear secret), never a full config blob. The server applies the op to the full parsed config (secrets intact server-side) and rewrites the file atomically.
2. **Positional addressing.** An edit target is identified by `(groupKey, index)`, not by id. No ids are written into `config.yml`; the file format is unchanged.
3. **Optimistic concurrency.** Reads carry a content hash of the config. An op carries the hash it was authored against; the server rejects (409) if the on-disk hash differs, and the client reloads. The existing `config:update` push is the "your base is stale" signal.
4. **Validate-before-write.** The server applies the op, runs the full `configSchema.parse` on the result, and writes only if it passes (else 422). This is the opposite disposition from the boot path, which degrades to a default config + error banner on a bad file. A save must never write a config that fails the schema.
5. **Watcher is the single broadcast path.** The editor's own write trips the watcher, which reloads and pushes `config:update` to everyone including the editor. The editor renders optimistically, adopts the hash returned by its save as its new base, and ignores an incoming `config:update` whose hash it already holds. One uniform reload path covers self-edit, other admins, and external hand-edits.

## Consequences
- `config.yml` stays byte-compatible with upstream and hand-editable; the fork stays easy to retire.
- Positional addressing is **only safe with the concurrency guard** — concurrent structural edits would otherwise apply an op to the wrong index. The guard (3) is therefore load-bearing, not polish.
- The client never holds secrets, so a full-state save cannot silently wipe them — impossible by construction.
- Reorders reindex server-side; that is trivial.

## Alternatives considered
- **Stable ids written into `config.yml`** — robust to reordering/concurrency, but pollutes the hand-written format, diverges from upstream schema, and makes the fork stickier. Rejected.
- **Content-hash identity** — breaks the moment the hashed fields are edited (the whole point of editing). Rejected.
- **Full-document PUT from the client** — would drop secrets (client can't see them) and clobber comments/order. Rejected.
- **Last-write-wins, no concurrency guard** — makes positional addressing unsafe under concurrent edits. Rejected.
