---
id: lean-bundles
title: webpack lean bundles
---

# Lean app bundles (`withLeanBundles`, `@conduction/nextcloud-vue/webpack`)

```js
// webpack.config.js, as the LAST line
const { withLeanBundles } = require('@conduction/nextcloud-vue/webpack')

module.exports = withLeanBundles(webpackConfig)
```

Apply it after the app has set its own rules and `optimization`: it rewrites
what is there. It does not mutate the config it is given and accepts the
multi-compiler array form.

## What it changes

| Setting | Before | After |
|---|---|---|
| every `css-loader` (in `use`, `loader`, `oneOf`, nested `rules`) | `sourceMap` follows `devtool` | `sourceMap: false` |
| `optimization.splitChunks.chunks` | `'all'` | `'initial'` |
| each cache group with `chunks: 'all'`, set or inherited | takes async chunks too | `chunks: 'initial'` |

Cache groups with `chunks: 'async'`, a function, or `false` are left alone.
The JavaScript `devtool` is not touched: JS source maps stay.

## Why

Measured on opencatalogi's production build (25 Nov 2026, nc-vue 2.226.0):

| File (minified) | Before | After |
|---|---|---|
| `opencatalogi-shared-nc-vue.js` | 15.3 MB | 5.9 MB |
| `opencatalogi-main.js` | 9.0 MB | 4.9 MB (with the `@mdi/js` fix below) |

1. **CSS source maps inside the JavaScript.** css-loader turns its source maps
   on when `devtool` is set, and style-loader's module carries the map,
   `sourcesContent` included. The library's 1.4 MB stylesheet was in every
   page's JavaScript twice.
2. **A shared cache group that takes async chunks.** The usual
   `ncVue: { name: '<app>-shared-nc-vue', chunks: 'all', enforce: true }`
   group also takes modules that only an `import()` reaches. The library
   loads its icon packs (RVO 1.9 MB), charts (apexcharts), code editor
   (CodeMirror), map (Leaflet) and flow diagrams on demand, and that group
   moved all of them into the chunk every page loads. With `'initial'` they
   stay in their own chunks, fetched when a component needs them.

## The `@mdi/js` catalogue

`CnIconBrowser` and `CnIconPicker` load the full Material Design set on demand
for their "mdi" source. They import `@mdi/js/commonjs/mdi.js`, not `@mdi/js`:
an `import()` of a module marks every export of it used, and webpack shares
that module with the app's own `import { mdiAccount } from '@mdi/js'`, so the
whole 2.5 MB pack landed in the app's main bundle. A separate file keeps the
app's imports tree-shaken; the full set is only in the lazy `cn-icons-mdi`
chunk. Nothing to do in the app for this part: raise the library version.
