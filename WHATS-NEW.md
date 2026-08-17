# What's new in this Mafl fork

A drop-in replacement for the official image. Same `config.yml`, nothing to migrate:

```yaml
services:
  mafl:
    image: ghcr.io/be-nj/mafl:integration
```

## Edit your dashboard in the browser

No more hand-editing YAML for every little change. Click a card and edit it in place:

- Rename services, change descriptions and links
- Pick icons by Iconify name, by URL, or upload your own image
- Add, delete and drag services between groups
- Add, rename and reorder groups
- Set tags, per-card status checks, and API keys

Changes save instantly and every open browser updates itself. Your `config.yml` stays plain, readable YAML you can still edit by hand.

**Off unless you turn it on.** Set a shared admin token, or point Mafl at the group header your existing forward-auth proxy (Authentik, Authelia, oauth2-proxy, …) already sends. With neither set, there is no editor and no way to write — exactly like the official image.

**One caveat:** saving from the editor rewrites the whole config file, which drops any comments you've put in it.

## Background images

```yaml
background:
  image: wallpaper.jpg   # drop the file in data/backgrounds/
  opacity: 0.8
  blur: 3
```

Or point `url:` at an image on the web instead.

## Icons from your own folder

Mount a folder of icons into the container and use them straight away — no rebuilding the image to add a logo.

## Health checks that point where you want

A service can now be checked at a different address than the one you click:

```yaml
status:
  enabled: true
  url: https://home-assistant.home.local/api/health
```

## Icons no longer squashed

Wide or tall logos keep their shape instead of being stretched into a square.

---

Full technical detail, including the security notes for the editor's auth: [`CHANGELOG-FORK.md`](./CHANGELOG-FORK.md).
