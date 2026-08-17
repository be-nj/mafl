# Fork changelog — `be-nj/mafl`

Everything the `integration` branch adds on top of upstream [`hywax/mafl`](https://github.com/hywax/mafl) `main`.

Base: upstream `main` @ `7090a1a` · 40 commits · 39 files changed, +2178 / −160 · last updated 2026-08-17

Upstream's own release notes live in [`CHANGELOG.md`](./CHANGELOG.md). This file only covers the fork's delta.

---

## Inline editing (fork-only)

An admin-only editor that changes `config.yml` from the dashboard itself. Upstream has no write path at all — editing the YAML by hand is the only way to change content. This is the fork's one substantial feature; everything about its design is written down in [`CONTEXT.md`](./CONTEXT.md) and [`docs/adr/`](./docs/adr/).

**Off by default.** With no auth provider configured, no request is ever admin, the editor never appears, and the app behaves exactly as upstream does.

### What you can edit

| Area | Editable |
| --- | --- |
| Service | title, description, link (inline, contenteditable) |
| Service | icon — Iconify name, URL, or file upload, with live preview |
| Service | tags |
| Service | status settings (enabled, interval, url) per card |
| Service | secrets (write-only — set or clear, never read back) |
| Service | add, delete, reorder, move between groups (drag-and-drop) |
| Group | add, rename, delete, reorder |

### Enabling it

Two auth providers, both configured via environment (read at request time, so container env applies without a rebuild):

```yaml
# forward-auth — trust a group header from a trusted upstream proxy
#   (Authentik, Authelia, oauth2-proxy, traefik-forward-auth, …)
environment:
  MAFL_AUTH_GROUPS_HEADER: X-Authentik-Groups
  MAFL_AUTH_ADMIN_GROUP: mafl-admins
  MAFL_AUTH_GROUPS_SEPARATOR: ","   # optional, default ","

# token — shared secret, for deployments with no proxy
environment:
  MAFL_ADMIN_TOKEN: <secret>        # client sends it as X-Mafl-Admin-Token
```

> **Security:** `forward-auth` is only safe if the app cannot be reached bypassing the proxy. If the container port is directly exposed, anyone can forge the group header and become admin. See [ADR 0001](./docs/adr/0001-admin-auth-via-forward-auth-or-token.md).

### How it writes

- **Edit ops, not full-document PUT.** The client sends granular ops (`set-field`, `set-tags`, `set-status`, `set-icon`, `set-secret`, `add`/`delete`/`move-service`, `add`/`rename`/`move`/`delete-group`) to `POST /api/config`. It never holds or sends a full config, so it can never clobber secrets it isn't allowed to see.
- **Positional addressing.** Targets are `(groupIndex, index)`. No ids are written into `config.yml` — the file stays byte-compatible with upstream and hand-editable.
- **Optimistic concurrency.** Every read carries a content hash; an op carries the hash it was authored against. Mismatch → `409`, client reloads.
- **Validate before write.** The op is applied in memory, the whole result is run through `configSchema`, and only then written atomically. A failing result → `422`, nothing is written.
- **Comments are not preserved.** A save round-trips the file through `yaml.parse` → `yaml.stringify`, so any comments in `config.yml` are dropped. Key order and formatting are normalised too.
- **One broadcast path.** The editor's own write trips the existing file watcher, which reloads and pushes `config:update` to every client. Self-edit, other admins, and external hand-edits all reload the same way.
- **Optimistic UI.** Edits render immediately; no round-trip wait, no hard reload.

Full reasoning in [ADR 0002](./docs/adr/0002-configuration-write-model.md).

### Icon uploads

Uploads go to the mounted icons volume, not into the config as base64 — `config.yml` stores only `icon.url = /icons/<name>`. The upload endpoint is admin-gated and owns filename sanitisation and collision handling. Note that uploaded icons are a sidecar: backing up `config.yml` alone no longer captures them. See [ADR 0003](./docs/adr/0003-icon-uploads-to-volume-not-base64.md).

### Secrets

`/api/settings` now reports each service's secret *key names* so the editor can render write-only fields, and never the values. Values still never leave the server.

---

## Upstream PRs bundled ahead of merge

These are open PRs against `hywax/mafl`, carried here so one image has all four. Each is kept close to its upstream PR so re-merging stays clean.

### Custom background images — [#188](https://github.com/hywax/mafl/pull/188)

```yaml
background:
  image: wallpaper.jpg    # from data/backgrounds/ — jpg, jpeg, png, gif, webp, svg
  url: https://…          # or an external URL instead
  opacity: 0.8            # 0.0–1.0, default 1.0
  blur: 3                 # pixels, default 0
```

Files are served from `data/backgrounds/` with ETag caching, a path-traversal guard, and a 10 MB cap.

### Local icons from a volume mount — [#190](https://github.com/hywax/mafl/pull/190)

A runtime route serves `public/icons/**` at `/icons/...`, so icons can live in a mounted Docker volume instead of being baked into the image. Also path-traversal guarded.

### Separate status URL from the service link — [#192](https://github.com/hywax/mafl/pull/192)

```yaml
status:
  enabled: true
  url: https://home-assistant.home.local/api/health   # falls back to `link`
```

Useful when the link points somewhere that isn't the right thing to health-check.

### Icon aspect-ratio fix — [#193](https://github.com/hywax/mafl/pull/193)

Non-square service icons keep their aspect ratio (`object-contain`) instead of being squashed.

---

## Build & tooling

- **Published image.** `Integration image` GitHub Action builds and pushes on every push to `integration` → `ghcr.io/be-nj/mafl:integration`, plus immutable `integration-<sha>` tags.

  ```yaml
  services:
    mafl:
      image: ghcr.io/be-nj/mafl:integration
  ```

- **amd64 only.** Dropped the arm64 leg — QEMU emulation made the build far too slow for a per-push image.
- **Dependency fixes** that upstream `main` needs anyway: `vue-tsc` bumped for TypeScript 5.7 (unbroke `typecheck`), `typescript-eslint` aligned with eslint 9.15 (unbroke `eslint`).
- **Pre-existing lint/type debt** in upstream files cleaned up so CI is green.
- CI job timeout raised 10 → 15 min for the Windows runner.
- The runtime `data/` directory is no longer tracked.

---

## Maintenance

Merge `upstream/main` into `integration`, push (the Action rebuilds), then bump the `integration-<sha>` tag in the deploy compose.

Retire the fork — back to `hywax/mafl:<pinned>` — once #188, #190, #192 and #193 are merged upstream. The inline editor would need to be proposed separately.
