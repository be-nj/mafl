# 0003 — Icon uploads stored in the icons volume, not base64 in config

## Status
Accepted

## Context
The inline editor lets an admin set a service icon by uploading an image (alongside entering an Iconify name or a URL). The uploaded bytes have to live somewhere. `ServiceBaseIcon` renders `<img :src="icon.url">`, so a `data:` URI would render — making base64-in-config technically possible. Icons are public, so there is no secrecy concern either way; the deciding factor is the config file.

The fork already serves files from a mounted icons volume at `/icons/...` (PR #190). The write model (ADR 0002) rewrites the whole `config.yml` atomically on every save and depends on that file staying small and hand-editable.

## Decision
Upload writes the image file to the icons volume; the config stores only a small path reference (`icon.url = /icons/<name>`). A new authenticated upload endpoint accepts the file, validates type, resolves name collisions, and writes into the volume. The existing route serves it.

## Consequences
- `config.yml` stays small, readable, and hand-editable; diffs and atomic rewrites stay cheap regardless of icon count.
- Reuses infrastructure the fork already added (PR #190).
- Introduces a write surface to the volume: it must be authenticated (`requireAdmin`, ADR 0001), the volume must be writable, and the endpoint owns filename-sanitisation and collision handling.
- Icons are now a sidecar to the config rather than self-contained within it — backing up the config alone no longer captures uploaded icons.

## Alternatives considered
- **Base64 `data:` URI in `icon.url`** — self-contained, zero new infra, but a single ~40 KB image becomes ~55 KB of base64 on one YAML line, destroying hand-editability and bloating every atomic rewrite and diff. Worsens per icon. Rejected.
- **Hybrid (base64 for tiny images, file for large)** — two code paths and a fuzzy threshold for little benefit. Rejected.
