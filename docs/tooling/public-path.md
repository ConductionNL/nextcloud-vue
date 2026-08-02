---
id: public-path
title: webpack publicPath
---

# `output.publicPath` for Nextcloud apps (`@conduction/nextcloud-vue/webpack`)

```js
// webpack.config.js
const { withPublicPath } = require('@conduction/nextcloud-vue/webpack')

module.exports = withPublicPath(require('@nextcloud/webpack-vue-config'))
```

That is the whole fix. The rest of this page is why you need it.

## The symptom

```
Refused to execute script from 'https://cloud.example.org/apps/openregister/js/812.js'
because its MIME type ('text/html') is not executable, and strict MIME type
checking is enabled.

ChunkLoadError: Loading chunk 812 failed.
```

A MIME refusal reads like a **server** misconfiguration. It is not. The network
tab makes it worse: the request is a green **200**, not a 404.

## The cause

`@nextcloud/webpack-vue-config` hardcodes:

```js
output.publicPath = `/apps/${appName}/js/`
```

That prefix is correct only for an app installed under the server's own `apps/`
directory. It is wrong for:

- apps under **`custom_apps/`** — which is every app in a docker-compose dev
  environment, and most production installs of a non-bundled app;
- **subdirectory** installs (`https://host/nextcloud/…`);
- anything behind a **reverse proxy** that rewrites the prefix.

Nextcloud's front controller answers an unmatched path by rendering the web UI,
so the browser asking for a lazy chunk at the wrong prefix receives **HTTP 200
with `Content-Type: text/html`** — a full HTML page where a JavaScript module
was expected. Hence the MIME refusal rather than a 404, and hence the green
status code.

**Vue 2 builds hid this completely** by emitting no async chunks at all. It
appears the moment an app moves to Vue 3 and code-splitting starts producing
them, which makes it look like a Vue 3 regression rather than a config value
that was always wrong.

## Why `'auto'` is the answer

With `publicPath: 'auto'`, webpack derives the prefix at runtime from
`document.currentScript.src` — the URL the entry bundle was *actually* loaded
from. Chunks then resolve correctly under `apps/`, `custom_apps/`, a
subdirectory install, or behind a proxy, with no build-time knowledge of any of
them.

Hardcoding `/custom_apps/<app>/js/` instead "fixes" your machine and breaks
every other install. The helper accepts an explicit override, but reach for it
only when you genuinely know the prefix and it cannot change.

## API

| Export | What it does |
| --- | --- |
| `withPublicPath(config, options?)` | Returns a **copy** of the config with `output.publicPath` set. Accepts the multi-compiler array form. Never mutates the input — `@nextcloud/webpack-vue-config` is a shared module instance, and mutating it changes the object every other `require` of it sees in the same build. |
| `AUTO_PUBLIC_PATH` | The string `'auto'`. Assert against this in a config test rather than retyping the literal. |

If you already spread the upstream config, set the value yourself:

```js
const base = require('@nextcloud/webpack-vue-config')
const { AUTO_PUBLIC_PATH } = require('@conduction/nextcloud-vue/webpack')

module.exports = {
  ...base,
  output: { ...base.output, publicPath: AUTO_PUBLIC_PATH },
}
```

## Verifying it

A build that emits no async chunks proves nothing, so check the value, not the
symptom:

```sh
node -e "console.log(require('./webpack.config.js').output.publicPath)"
# auto
```

Then load the app from a `custom_apps/` install and confirm the chunk requests
in the network tab carry the install's real prefix.
