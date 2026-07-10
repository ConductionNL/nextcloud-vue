## Context

`@conduction/nextcloud-vue` is consumed two ways across the fleet (confirmed via
`procest/webpack.config.js:62-73` and sibling apps' webpack configs):

- **Dev / `useLocalLib=true`**: webpack aliases `@conduction/nextcloud-vue` straight to
  `../nextcloud-vue/src`, so the consuming app's own webpack tree-shakes the *source* files
  directly. The `dist/` bundle-shape problems this change targets don't apply here.
- **Production / beta-published / `useLocalLib=false`**: the app installs the npm package and
  resolves `main`/`module` to `dist/nextcloud-vue.cjs.js` / `dist/nextcloud-vue.esm.js` — the
  single pre-bundled 9.9MB files. This is the path every deployed app takes (beta auto-publishes
  on push per the `ncvue-app-lib-resolution-and-beta-publish` gotcha), so the fix below is a
  production-bundle-size fix, not a dev-experience fix.

## Goals / Non-Goals

**Goals**: shrink the per-consumer production bundle contribution of `@conduction/nextcloud-vue`
by (a) letting Rollup emit multiple chunks instead of one inlined file, (b) letting consumer
bundlers drop unused chunks/exports via an honest `sideEffects` declaration, (c) removing the
266KB Ajv-compiled validator from the default import graph, (d) dropping the dead `lodash` dep.

**Non-Goals**: this change does not touch `apexcharts`/`vue-apexcharts` (intentionally shared per
CLAUDE.md), does not change any component's public API, does not change `main`/`module`/`types`
entry-point *names* in `package.json`, and does not attempt per-component "sub-path exports"
(`@conduction/nextcloud-vue/CnDataTable`) — that's a larger API-surface change or ADR and out of
scope here.

## Decisions

### 1. Drop `inlineDynamicImports`, move ESM output to chunked `output.dir`

Rollup's `inlineDynamicImports: true` (`rollup.config.js:60,66`) forces single-file output even
though the source already contains legitimate `import()` call sites (`CnObjectListWidget.vue:233`,
`CnChartWidget.vue:524/598/659`, `resolveManifestSentinels.js:215`) that *could* become real
async chunks. Switching the ESM output from `{ file: ..., inlineDynamicImports: true }` to
`{ dir: 'dist/esm', format: 'es', preserveModules: true }` gives Rollup permission to (a) keep
those dynamic imports as real lazy chunks, and (b) let a consumer's bundler statically analyze
which of the library's *own* internal modules are reachable from the exports the consumer
actually imports, instead of treating the whole barrel as one indivisible unit.

The CJS output stays single-file (`inlineDynamicImports: true` retained there) — CJS has no
standard dynamic-chunk-loading convention and none of our consumers build against the CJS entry
in practice (all use webpack + ESM `module` resolution).

`package.json`'s `"module"` field changes from `"dist/nextcloud-vue.esm.js"` to
`"dist/esm/index.js"` (the `preserveModules` entry chunk). `"main"` (CJS) is unchanged.

### 2. `sideEffects`: `true` → explicit array

```json
"sideEffects": [
  "*.css",
  "./src/integrations/registry.js",
  "./dist/esm/integrations/registry.js"
]
```

Only the CSS imports and the integration-registry's `window.OCA` install side effect are genuine
module-scope side effects. Every other file — components, composables, utilities, the store — is
a pure export and safe to mark side-effect-free, which is the flag webpack's `usedExports` +
`sideEffects` optimization needs to actually elide unreferenced chunks from a consumer's build.

### 3. Lazy-load the compiled v2 validator

`src/utils/validateManifest.js:8` currently does:

```js
import _compiledValidateV2 from './validateManifestV2.compiled.js'
```

This becomes a dynamic import inside the function that needs it:

```js
async function getCompiledV2Validator() {
  const mod = await import('./validateManifestV2.compiled.js')
  return mod.default || mod
}
```

`validateManifestV2` becomes `async`. Its one caller inside the library,
`useAppManifest.js`, has two branches, both already tolerant of this:

- `loadFromBackend` (`useAppManifest.js:178-259`) already runs the whole validation step inside
  an `async` IIFE (`;(async () => { ... })()`); awaiting the dynamic import adds one microtask/
  chunk-fetch before `manifest.value = resolved`/`validationErrors.value` are set. `isLoading`
  stays `true` until that `finally` block, so no state is observed half-updated.
- `loadInMemory` (`useAppManifest.js:142-162`) currently calls `validateManifest` synchronously
  and only when `options.validate === true` (an opt-in, informational-only path used by the
  OpenBuild virtual-app host). This branch changes shape slightly: `validationErrors` starts as
  `null` and is populated by a `.then()` after the dynamic import resolves, rather than being set
  before `loadInMemory` returns. Callers already treat `validationErrors` as a reactive ref they
  watch, not a synchronously-available value, so no known caller is broken — but this is the one
  small externally-observable timing change in this proposal and consumers doing
  `useAppManifest({ manifest, validate: true }).validationErrors.value` *immediately* after the
  call (rather than in a `watch`/render) would see `null` for one extra tick. Grepped the fleet:
  no such synchronous read exists today.
- The **v1** `validateManifest` path (`ajv` is not involved — the v1 schema validator per
  `src/utils/validateManifest.js`'s existing structure) is unaffected; only the v2/compiled path
  moves behind the dynamic import, since that's the only one carrying the 266KB payload.

### 4. Remove `lodash`

Zero imports found (`grep -rn "lodash" src` → no matches). Straight deletion from
`package.json` `dependencies`.

## Risks / Trade-offs

- **`preserveModules` output changes `dist/` file layout.** Any tooling that globs
  `dist/nextcloud-vue.esm.js` by exact filename (not just `package.json` resolution) breaks.
  Verified no such references exist in `apps-extra` outside this repo's own `rollup.config.js`
  and `nextcloud-vue/src/components/CnMapWidget/CnMapWidget.vue` (an in-repo doc comment, not a
  build reference).
- **Async validator changes error-surface timing for `loadInMemory`'s opt-in `validate: true`
  path.** Documented above; low risk since the ref is reactive and consumed via `watch`/render in
  all known call sites.
- **Chunked output may increase the number of HTTP requests** for apps that end up needing most
  of the library anyway (e.g., `CnAppRoot`-heavy apps). This is the expected and correct trade —
  those apps already need the bytes; apps using a handful of components stop paying for the rest.
