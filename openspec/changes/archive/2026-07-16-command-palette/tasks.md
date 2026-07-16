# Tasks: command-palette

## Library (`@conduction/nextcloud-vue`)

- [x] **Ranking engine** — `src/utils/commandPaletteRanking.js`:
      `rankCommandPaletteItems(items, query, options?)` (exact-prefix /
      word-prefix / fuzzy-subsequence tiers, keyword-field penalty,
      bounded recency boost, `includeNonMatching` escape hatch for
      server-pre-filtered sources) + `groupRankedResultsBySection(ranked)`.
      Pure, dependency-free, internal (not part of the public barrel).

- [x] **Command registry** — `src/commandPalette/registry.js`:
      `createCommandRegistry()` factory + `commandPaletteRegistry` default
      singleton. Map-based, `onChange` subscribers, upsert-on-duplicate-id
      (no throw — commands churn across route changes more than
      integrations do). `__resetForTests()` clears commands only, NOT
      listeners (a long-lived module subscription must survive a per-test
      data reset).

- [x] **Recency tracker** — `src/commandPalette/recency.js`:
      `createRecencyTracker(appId)`, `localStorage`-backed, capped at 200
      tracked ids, silently degrades to no-boost on unavailable storage.
      Internal (not part of the public barrel).

- [x] **`useCommandPalette()`** — `src/composables/useCommandPalette.js`:
      shared `Vue.observable` open/close state + reactive command-list
      snapshot, `register`/`unregister`/`open`/`close`/`toggle`, optional
      registry override for test isolation. Exported from `src/index.js`.

- [x] **`createObjectSearchSource()`** —
      `src/utils/commandPaletteObjectSource.js`: debounced/stale-discarding
      adapter over `store.fetchCollection(type, {_search, _limit})` across
      multiple types in parallel; `resolveResult`/`router` hooks for
      navigation. `resolveManifestDetailRoute` helper (subpath-only, same
      precedent as the NL-government icon sets). Exported from
      `src/index.js` (the helper stays subpath-only).

- [x] **`CnCommandPalette` component** —
      `src/components/CnCommandPalette/CnCommandPalette.vue`: `NcDialog`-
      based modal, WAI-ARIA combobox/listbox markup, Ctrl/Cmd+`shortcut`
      global open (disable-able), Escape close, Up/Down/Enter keyboard
      flow via `aria-activedescendant`, focus capture/restore on
      open/close, debounced object search with staleness discard,
      `select` event. 100% JSDoc coverage (`check-jsdoc.js`, new-component
      bar). Exported from `src/components/index.js` + `src/index.js`.

- [x] **`CnAppRoot` opt-in mount** — new `commandPalette` prop
      (`Boolean|Object`, default `false`), mirroring the `aiCompanion` /
      `supportDialog` convention: auto-mounts `CnCommandPalette` wired to
      `manifest`/`$router`/`appId`, object form spreads prop overrides
      (`v-bind`) over the auto-wired defaults.

## Docs

- [x] `docs/components/cn-command-palette.md` — adoption paths (zero-config,
      registering actions, wiring objects, standalone mount), full
      props/events tables, ranking/recency/accessibility notes.
- [x] `docs/utilities/composables/use-command-palette.md` — registration
      API, command descriptor shape, shared-state semantics, test
      isolation.
- [x] `docs/utilities/create-object-search-source.md` — config table,
      cancellation semantics, `resolveManifestDetailRoute` example,
      default `resolveResult` behaviour.
- [x] `docs/components/cn-app-root.md` + co-located
      `src/components/CnAppRoot/CnAppRoot.md` — `commandPalette` prop row.
- [x] Fixed 2 pre-existing `check:docs` gaps encountered while running the
      gate (`CnIndexPage`'s undocumented `subscribe` prop; unrelated to
      this change, fixed as encountered per repo convention).

## Tests

- [x] `tests/utils/commandPaletteRanking.spec.js` — 19 assertions: tier
      matrix (exact/word/fuzzy/none), case-insensitivity, keyword matches,
      same-tier/same-score alphabetical tie-break, fully-tied original-
      order tie-break, empty-query idle order, recency boost (incl. its
      tier-safety bound), `includeNonMatching`, section grouping.
- [x] `tests/commandPalette/registry.spec.js` — 9 assertions: register/
      list/unregister/upsert/onChange/validation/`__resetForTests`
      semantics.
- [x] `tests/composables/useCommandPalette.spec.js` — 4 assertions: shared
      open/close/toggle state, register/unregister delegation, reactive
      command snapshot, isolated-registry override.
- [x] `tests/utils/commandPaletteObjectSource.spec.js` — 13 assertions:
      min-query-length short-circuit, multi-type aggregation, default +
      custom `resolveResult`, `run`-over-`route` precedence, stale-response
      discard, per-type rejection tolerance, no-title skip,
      `resolveManifestDetailRoute` matching/`:param` substitution.
- [x] `tests/components/CnCommandPalette.spec.js` — 17 assertions: open/
      close via composable + Ctrl/Cmd+shortcut + Escape, `disableShortcut`,
      navigation source from `manifest.menu` (captions excluded), router/
      href navigation, registered-action surfacing, keyboard Up/Down/Enter
      (incl. clamping, no wraparound), click activation + `select` event,
      focus capture/restore, objectSearch debounce + never-blocks-static-
      results + stale-result discard (fake timers).
- [x] `tests/components/CnAppRoot.spec.js` "Command palette opt-in" — 4
      assertions: default off, explicit `false`, `true` wires
      manifest/appId, object form spreads prop overrides. (Also removed a
      pre-existing exact-duplicate `describe` block for the AI companion
      opt-in tests, encountered while adding this section.)
- [x] `tests/a11y/CnCommandPalette.a11y.spec.js` — 3 assertions via
      `expectAccessible()`: open/idle state, results state (ranked +
      sectioned), empty-results state. Zero WCAG 2.1 AA violations.

## Verification

- [x] `npm test` — 473 suites / 5335 tests green (up from the pre-change
      465/473 suite baseline — new suites are entirely this change's).
- [x] `npm run check:a11y` — 7 suites / 23 tests green (up from 6/20).
- [x] `npm run lint` — zero errors/warnings in every file this change
      touches (3 pre-existing, unrelated `@vueuse/core`-resolution errors
      confirmed present before this change and left untouched).
- [x] `npm run build` — clean; `axe-core` confirmed ABSENT from `dist/`
      (grep); `CnCommandPalette` confirmed PRESENT in both
      `dist/esm/index.js` and `dist/nextcloud-vue.cjs.js`.
- [x] `node scripts/check-docs.js` — all 384 public exports (incl. this
      change's 3 new ones) documented; component prop/slot accuracy
      215/215.
- [x] `node scripts/check-jsdoc.js` — `CnCommandPalette` scores 100%
      (12/12), meeting the new-component bar; all 239 components meet
      their baseline.
