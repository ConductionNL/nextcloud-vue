# Tasks — scoped-theme-applier

## 1. `useScopedTheme` composable

- [x] 1.1 Create `src/composables/useScopedTheme.js` — port `rewriteRootScope()` from OpenBuild's
      `openbuild/src/composables/useAppTheme.js` (flat-`:root`-only positive-recognition rewrite,
      bail-to-`null` on any at-rule/nesting/other-selector), retargeted at the nldesign scope
      attribute `data-nldesign-theme-scope`. Export `rewriteRootScope` and `SCOPE_ATTR`.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-1
- [x] 1.2 Implement `useScopedTheme(opts)` returning `{ apply, teardown, fetchTokenCss,
      listTokenSets, evaluateContrast }`. `apply(manifest, scopeId)` / `teardown(scopeId)` /
      session-cached `fetchTokenCss(tokenSet)` mirror `useAppTheme`'s logic exactly, fetching
      `generateFilePath('nldesign', 'css', 'tokens/<tokenSet>.css')` and injecting/removing one
      managed `<style data-nldesign-theme="<scopeId>">`.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-1
      - files: src/composables/useScopedTheme.js
- [x] 1.3 Implement `listTokenSets()` — `GET generateUrl('/apps/nldesign/api/token-sets')`,
      returns `data.tokenSets` on success, `[]` on any failure (never throws).
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-2
      - files: src/composables/useScopedTheme.js
- [x] 1.4 Implement `evaluateContrast(candidates, background)` — `POST generateUrl('/apps/nldesign/api/contrast/evaluate')`
      with `{ candidates, background }`, returns `data.results` on success, `null` on any
      failure (never throws, never fabricates a `blocked`/`allowed` verdict).
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-2
      - files: src/composables/useScopedTheme.js
- [x] 1.5 Export `clearScopedThemeCache()` test helper; add `useScopedTheme` to
      `src/composables/index.js` and `src/index.js` barrels.
      - files: src/composables/useScopedTheme.js, src/composables/index.js, src/index.js

## 2. `CnAppRoot` wiring

- [x] 2.1 Bind `:data-nldesign-theme-scope="appId"` on `CnAppRoot`'s root `<NcContent>` element
      (alongside the existing `data-testid="cn-app-root"`).
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-3
      - files: src/components/CnAppRoot/CnAppRoot.vue
- [x] 2.2 In `setup(props)`, construct `useScopedTheme()` and add a `watch` (deep, immediate)
      over the effective manifest's `runtime.theme` — reading through the same
      editing/`manifestEditor.source.value` vs `props.manifest` branch `cnManifest`'s getter
      already uses — calling `apply(effectiveManifest, props.appId)` on change.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-3
      - files: src/components/CnAppRoot/CnAppRoot.vue
- [x] 2.3 Call `scopedTheme.teardown(props.appId)` from `beforeDestroy()` alongside the existing
      `beforeunload` listener cleanup.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-3
      - files: src/components/CnAppRoot/CnAppRoot.vue

## 3. Manifest schema promotion

- [x] 3.1 Add `$defs/runtimeTheme` (`source` closed-enum `["nldesign"]`, required `tokenSet`
      kebab-case pattern, optional `tokenSetName`, optional `preview.{primaryColor,
      backgroundColor}`, `additionalProperties: false`) to `app-manifest-v2.schema.json`;
      reference it from `runtime.properties.theme`; bump `version` `2.19.0` → `2.20.0`.
      DEVIATION: beta HEAD had already advanced the schema to `2.20.0` (mcp-visibility-block +
      api-call payload PRs, merged after this change's design.md was drafted) — bumped to
      `2.21.0` instead to keep the sequential-minor invariant.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-4
      - files: src/schemas/app-manifest-v2.schema.json

## 4. Docs

- [x] 4.1 Add `docs/utilities/composables/use-scoped-theme.md` — API surface, the nldesign
      contract it implements, and a `runtime.theme` usage example.
      - files: docs/utilities/composables/use-scoped-theme.md
- [x] 4.2 Update `docs/components/cn-app-root.md` — document the `data-nldesign-theme-scope`
      root attribute and the automatic `runtime.theme` consumption.
      - files: docs/components/cn-app-root.md
- [x] 4.3 Update the v2 schema section of `docs/architecture/manifest.md` with the new
      `runtime.theme` field shape and a pointer to `use-scoped-theme.md`.
      - files: docs/architecture/manifest.md

## 5. Tests

- [x] 5.1 Jest tests for `useScopedTheme`: apply injects the scoped style; bail-on-unsafe-CSS
      (at-rule, nesting, non-`:root` selector) injects nothing and warns; teardown removes the
      style; re-`apply()` is idempotent (teardown-then-reapply); nldesign absent/404/network
      failure degrades silently (`apply` resolves `false`, no throw); `listTokenSets()` returns
      `[]` on failure; `evaluateContrast()` returns `null` on failure and passes through the
      no-verdict response shape on success.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-1
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-2
      - files: tests/composables/useScopedTheme.spec.js
- [x] 5.2 Jest schema tests: a manifest with a valid `runtime.theme` validates; a `tokenSet`
      failing the kebab-case pattern fails; `source` other than `"nldesign"` fails; an unknown
      key on `runtime.theme` fails (`additionalProperties: false`); a manifest with no
      `runtime.theme` still validates unchanged (regression).
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-4
      - files: tests/schemas/app-manifest-v2.schema.spec.js
- [x] 5.3 `CnAppRoot` component test: mounting with a `manifest.runtime.theme` calls
      `useScopedTheme().apply()` with the manifest and `appId`; the root element carries
      `data-nldesign-theme-scope="<appId>"`; unmounting calls `teardown(appId)`.
      - spec_ref: specs/scoped-theme-applier/spec.md#req-sta-3
      - files: tests/components/CnAppRoot.spec.js

## 6. Verification

- [x] 6.1 `npm run lint`, `npm test`, `npm run build` all pass; `npm run check:docs` passes.
      `npm run check:jsdoc` could NOT be run — it requires `cd docusaurus && npm install
      --legacy-peer-deps`, forbidden by this repo's own CLAUDE.md npm rule. No new prop, event,
      or slot was added to `CnAppRoot` (only the `data-nldesign-theme-scope` non-prop attribute
      binding + internal `setup()`/`beforeDestroy()` wiring), so no baseline regression is
      expected — unverified, flagged for the coordinator/CI to confirm.
- [x] 6.2 `openspec change validate scoped-theme-applier --strict` and
      `openspec spec validate scoped-theme-applier --strict` both pass (change + spec).

Acceptance criteria:
- A manifest declaring `runtime.theme = { source: "nldesign", tokenSet: "<id>" }` renders the
  scoped token CSS under `[data-nldesign-theme-scope="<appId>"]` with zero per-app code.
- nldesign absent, unreachable, or serving non-flat `:root` CSS never throws and never blocks
  the app shell — default styling renders, at most a `console.warn`.
- `app-manifest-v2.schema.json` version 2.21.0 (bumped from the beta-HEAD baseline of 2.20.0 —
  see the 3.1 deviation note above); every pre-existing fixture manifest (no `runtime.theme`)
  still validates.
- No existing `CnAppRoot` prop, event, or slot changed.
