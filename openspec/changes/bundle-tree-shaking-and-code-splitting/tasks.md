## 1. Baseline measurement

- [ ] 1.1 Record current `dist/nextcloud-vue.esm.js` size (9,919,240 bytes as of 2026-07-03) and
  `src/utils/validateManifestV2.compiled.js` size (266,380 bytes) as the before-state.
- [ ] 1.2 Build a minimal smoke-test consumer (single-component import, e.g.
  `import { CnStatusBadge } from '@conduction/nextcloud-vue'` through a throwaway webpack config)
  and record its bundled size as the current worst-case-for-a-small-consumer baseline.

## 2. Rollup output — enable chunking

- [ ] 2.1 In `rollup.config.js`, remove `inlineDynamicImports: true` from the `es` output block
  (`rollup.config.js:60`); switch it to `{ dir: 'dist/esm', format: 'es', preserveModules: true,
  preserveModulesRoot: 'src', sourcemap: true }`.
- [ ] 2.2 Leave the `cjs` output block (`rollup.config.js:66`) with `inlineDynamicImports: true`
  unchanged — single-file CJS is intentional (see design.md §1).
- [ ] 2.3 Update `package.json`'s `"module"` field to the new ESM entry chunk path
  (`dist/esm/index.js`); leave `"main"` (CJS) untouched.
- [ ] 2.4 Run `npm run build` and confirm `dist/esm/` contains multiple chunk files (not one
  monolithic `index.js`), and that `dist/esm/index.js` re-exports everything the old
  `dist/nextcloud-vue.esm.js` did (spot-check a handful of named exports resolve).

## 3. `sideEffects` — explicit array

- [ ] 3.1 Change `package.json`'s `"sideEffects": true` to the explicit array from design.md §2
  (`*.css`, the integration-registry install file in both `src/` and the new `dist/esm/` path).
- [ ] 3.2 Grep `src/` for any other module-scope `window.*` / `document.*` mutation or global
  registration outside CSS and the integration registry (e.g. `registerIcons`,
  `registerTranslations` bootstrap helpers) — if any exist and run at *import* time (not inside an
  exported function the consumer calls explicitly), add them to the `sideEffects` array too.
  Functions that only run when the consumer *calls* them (e.g. `registerIcons({...})`) are NOT
  side effects for this purpose — only unconditional module-top-level code counts.

## 4. Lazy-load the compiled v2 validator

- [ ] 4.1 In `src/utils/validateManifest.js`, remove the static
  `import _compiledValidateV2 from './validateManifestV2.compiled.js'` and replace with an
  async loader function per design.md §3.
- [ ] 4.2 Make `validateManifestV2` (and any internal helper that calls the compiled validator)
  `async`; update its JSDoc `@return` to `Promise<{ valid, errors }>`.
- [ ] 4.3 In `src/composables/useAppManifest.js`, `await validateManifestV2(...)` (or whatever the
  v2 dispatch point is inside `validateManifest`) in both `loadFromBackend`'s IIFE and
  `loadInMemory`'s `options.validate === true` branch. `loadInMemory` becomes: fire the async
  validation, populate `validationErrors` in a `.then()`/`.catch()`, and document the ref starts
  `null` until that resolves.
- [ ] 4.4 Update `useAppManifest.js`'s JSDoc examples (there's a "With sentinel resolution" and
  an "In-memory manifest with pre-mount validation" example) to note `validationErrors` populates
  asynchronously even in the in-memory branch.
- [ ] 4.5 Confirm no other file in `src/` or `src/cli/manifest-migrate.js` statically imports
  `validateManifestV2.compiled.js` in a context that can't tolerate the async change (the CLI
  script runs in Node and can `await` freely — check it uses the same async entry point after
  the change, not a duplicate synchronous import).

## 5. Remove dead `lodash` dependency

- [ ] 5.1 Remove `"lodash": "^4.17.21"` from `package.json` `dependencies`.
- [ ] 5.2 Run `npm install` and confirm no transitive dependency of another package silently
  relied on the top-level hoist (unlikely, but verify `npm ls lodash` still resolves via
  transitive deps if anything needs it, just no longer as a direct dependency of this package).

## 6. Verify

- [ ] 6.1 `npm test` (jest) — all existing suites pass, in particular any test that imports
  `validateManifest`/`validateManifestV2` directly must now `await` it.
  `pretest` still runs `build:validators` unchanged.
- [ ] 6.2 `npm run build` succeeds; `dist/esm/` chunk count and total bytes recorded and compared
  against the §1 baseline — the minimal single-component smoke build from 1.2 should shrink
  substantially now that the compiled validator and unreferenced components are no longer forced
  into its graph.
- [ ] 6.3 `npm run check:integration-build` and `npm run check:integration-parity` (existing CI
  gates) still pass against the new `dist/` shape.
- [ ] 6.4 Manually smoke-test one real consumer app (e.g. pipelinq) built with `useLocalLib=false`
  (production/beta path) against a locally-packed tarball of this change (`npm pack` +
  install the tarball) to confirm the app still boots and renders correctly with the chunked
  `dist/esm/` output — this is the path that matters (see design.md Context).
- [ ] 6.5 Update `docs/` if `check:docs` flags anything (it shouldn't — no export names changed).
