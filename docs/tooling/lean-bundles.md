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
| `@nextcloud/vue`'s `dist/index.mjs` | has side effects (the package declares none) | `sideEffects: false` (rule appended to `module.rules`) |
| `@nextcloud/vue`'s `NcSelect`, `NcSelectUsers`, `NcProgressBar` chunks | read the body's style tokens per component | read once per page (loader rule appended to `module.rules`) |

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

## One `@nextcloud/vue` import, the whole of `@nextcloud/vue`

`@nextcloud/vue` 9 has no `sideEffects` field in its `package.json`, so webpack
must keep every module its index imports. One
`import { NcButton } from '@nextcloud/vue'` therefore bundled every component
it lists, with emoji-mart, the date picker and the markdown stack: 2.2 MB
minified for one button (measured 25 Nov 2026, @nextcloud/vue 9.9.0). The
index module only imports and re-exports, so `withLeanBundles` appends a rule
marking that one file free of side effects; webpack then links each name to
the component's own module, and a button costs 5 KB. Each component's own
modules and stylesheets keep their side effects.

The library's own dist already imports every Nc* component from its entry
(`@nextcloud/vue/components/<Name>`, rewritten at build time by
`rollup.nextcloud-vue-deep.mjs`), so this rule matters for the app's own
imports and for Nc* names an app takes from `@conduction/nextcloud-vue`.
Eager chunk of a one-line app, minified, everything but `vue` bundled:

| Entry imports | Before | After |
|---|---|---|
| `CnAppRoot` | 3.03 MB | 1.11 MB |
| `CnIndexPage` | 3.78 MB | 2.21 MB |
| `CnDetailPage` | 4.21 MB | 2.37 MB |
| `CnDashboardPage` | 3.44 MB | 1.89 MB |

## `NcSelect` reads the body style tokens once per page

In `@nextcloud/vue` (9.x up to at least 9.14.1), `NcSelect` and `NcSelectUsers`
compute an avatar size in every `setup()` by calling
`window.getComputedStyle(document.body).getPropertyValue(...)` twice: once
for `--default-clickable-area` and once for `--default-grid-baseline`.
`NcProgressBar` makes the same reads once, at module level. While the page is
still being built, each of these reads forces a style recalculation of the
whole document. Five selects on one page cost ten forced recalculations. On
the OpenRegister Registers page that was 73-85 ms of the warm load by CPU
profile (reference stack, 27 Nov 2026).

`withLeanBundles` appends `NEXTCLOUD_VUE_BODY_STYLE_RULE`, which sends exactly
those three chunks through `webpack/body-style-once-loader.js`. The loader
rewrites that one expression to a per-page memo (a `Map` on `globalThis`,
shared by every chunk). The values are theme size tokens that do not change
while a page is open, so every select renders the same avatar size. A chunk
without the expression passes through unchanged.

Registers page, 2 interleaved rounds x 7 warm loads: total 1519 / 1466 ms ->
1314 / 1253 ms, first useful content 1512 / 1424 ms -> 1160 / 1060 ms.

## Link the library stylesheet: `LibraryStylesheetCopy`

`import '@conduction/nextcloud-vue/css/index.css'` in an entry makes style-loader carry the ~1.1 MB sheet as text inside the bundle and insert it on every page load. A **linked** stylesheet stays parsed in the browser cache between loads. On the sandbox reference stack this took ~30-150 ms off warm loads (launchpad Workspace, opencatalogi Search, pipelinq Sales, OpenRegister Registers).

```js
// webpack.config.js
const { LibraryStylesheetCopy } = require('@conduction/nextcloud-vue/webpack')
webpackConfig.plugins.push(new LibraryStylesheetCopy()) // writes css/nextcloud-vue.css after emit
```

Then, on every page whose entry imported the sheet:

1. link it before the app's own style: `Util::addStyle('<appid>', 'nextcloud-vue');`
2. remove `import '@conduction/nextcloud-vue/css/index.css'` from that entry;
3. add `/css/nextcloud-vue.css` to `.gitignore`.

Options: `to` (default `css/nextcloud-vue.css`, relative to the app root) and `from` (default: the file `css/index.css` imports, i.e. the sheet without the board-look block; `enableBoardLookStyle()` still adds that block at runtime). `libraryStylesheetSource()` returns that default path.

Check each page that loads a split shared chunk (admin settings, dashboard widgets): it must link the sheet too, or its library components render unstyled.
