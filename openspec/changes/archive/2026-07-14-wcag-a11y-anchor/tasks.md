# Tasks: wcag-a11y-anchor

## Library (`@conduction/nextcloud-vue`)

- [x] **Add `axe-core` as a devDependency** (`^4.12.1`) AND an OPTIONAL
      peerDependency (`^4.10.0` in `peerDependencies` +
      `peerDependenciesMeta.axe-core.optional = true`, mirroring the
      existing `dexie`/`dompurify`/`marked` pattern). NOT a runtime
      `dependency`.

- [x] **New helper**: `src/testing/a11y.js` exporting
      `expectAccessible(target, options?)` and `WCAG_AA_TAGS`. Accepts a
      `@vue/test-utils` wrapper, a Vue instance, or a raw DOM node; runs
      `axe.run()` with `runOnly: { type: 'tag', values: tags }`
      (default {@link WCAG_AA_TAGS}); throws a formatted `Error` listing
      each violation on failure; returns the full `results` on success.
      `options.excludeRules` disables named rules (documented, per-use).
      `axe-core` is `require`d lazily with a clear "add it to your
      devDependencies" error.

- [x] **Barrel + root shim**: `src/testing/index.js` re-exports the
      helper; `testing/index.js` (package root) re-exports from
      `../src/testing/index.js` so consumers can write the short subpath
      `@conduction/nextcloud-vue/testing`. `package.json` `files[]` gains
      `testing/`. Helper is DELIBERATELY not re-exported from
      `src/index.js` (keeps axe-core out of the Rollup entry graph).

- [x] **`check:a11y` npm script** + `jest.a11y.config.js` — a dedicated
      Jest project over `tests/a11y/**/*.spec.js` that maps
      `@nextcloud/vue` to a curated real-component shim (so axe inspects
      real ARIA markup) and provides a richer `@vueuse/core` stub.
      `jest.config.js` gains `testPathIgnorePatterns: [.../tests/a11y/]`
      so `npm test` never double-runs the lane against the stub tree.

- [x] **Real-component shim**: `tests/a11y/support/realNextcloudVue.js`
      resolves real `@nextcloud/vue` components via their per-component
      subpath exports (avoids the ESM-only transitive chain that the full
      barrel pulls in), with documented hand stubs for the five that hit
      that chain (`NcSelect`/`NcListItem`/`NcRichContenteditable`, plus
      `NcAvatar`/`NcListItemIcon` avoided).

- [x] **Support helpers**: `mountAttached` (axe needs connected DOM),
      `openNcActionsMenu` (popover menu content), `jsdomEnvPolyfill`
      (quiets jsdom canvas + pseudo-element `getComputedStyle` gaps —
      noise only, no verdict change), `vueuseCoreStub`.

- [x] **Apply the anchor** to a meaningful sample — one `*.a11y.spec.js`
      per component, all green (20 assertions total):
      - `CnConfirmDialog` (dialog/modal base) — 4
      - `CnDataTable` (tabular list primitive) — 4
      - `CnSavedViewsControl` (actions-menu control) — 4
      - `CnIndexPage` (fleet's most-used page, real sub-components) — 2
      - `CnFormPage` (form inputs: text/textarea/checkbox/number/
        password/select) — 3
      - `CnNotesTab` (composer + notes list) — 3

- [x] **Fix real violations surfaced** (real fixes, no rule-disabling):
      - `CnDataTable` loading spinner `role-img-alt` → `aria-hidden`.
      - `CnNotesTab` loading spinner `role-img-alt` → `loadingLabel`.
      - `CnNotesTab` `<li>` outside a list (`listitem`) → `<ul>` wrapper
        + list-style reset.

- [x] **Documentation**: `docs/testing/accessibility.md` — how an app
      adopts `expectAccessible` in its own Jest/Vitest suite, the default
      WCAG tag set, the jsdom color-contrast caveat, and the
      documented-exclusion policy.

- [x] **`npm test`** stays green (465 suites / 5250 tests) — the a11y
      lane is excluded from it and run via `npm run check:a11y`.

- [x] **`npm run check:a11y`** green (6 suites / 20 tests, zero console
      noise).

- [x] **`npm run lint`** + **`npm run build`** pass.

- [x] **Bundle-safety proof**: `axe-core` is absent from `dist/` after a
      clean build (grep the built output).

## Consumer adoption (documentation only, no code change)

- [x] Document the opt-in: apps add `axe-core` to their OWN
      devDependencies and `import { expectAccessible } from
      '@conduction/nextcloud-vue/testing'`.
