<!--
APPLY STATUS 2026-07-07 (isolated worktree, no publish):
- §1 Vue 2.7 assumptions VERIFIED against vue@2.7.16 (pinned as jest tests): reactive(obj)===obj
  in place; shallowRef(obj) does NOT deep-convert (no __ob__).
- §1.2 DESIGN DEVIATION (verified necessary): design prescribed shallowRef(markRaw(...)), but markRaw
  sets __v_skip which makes the §2 in-place reactive() UPGRADE a SILENT NO-OP in Vue 2.7 — it would
  break ADR-041 live editing. Applied shallowRef ALONE (no markRaw). shallowRef already gives the
  full boot-cost win AND keeps the upgrade working. Pinned by a test asserting the upgrade succeeds.
- §2 useAppManifest: loadInMemory + loadFromBackend use shallowRef (not ref); publish stays
  manifest.value = resolved (shallowRef reassignment still re-renders). JSDoc updated.
- §3 CnAppRoot: added exported helper upgradeManifestToEditable() (in useManifestEditor.js);
  watch(openBuildEditable, {immediate:true}) upgrades in place when available; props.manifest hot-swap
  re-upgrades. §3.4 (NOT in original list, REQUIRED): changed baseRef from ref() to shallowRef() —
  Vue 2.7 ref() on an object deep-converts at mount, re-introducing the exact boot cost; shallowRef
  keeps it raw. Without markRaw this was mandatory for the change to deliver anything for CnAppRoot apps.
- §4 useManifestEditor.enter() calls upgradeManifestToEditable() before snapshot (fallback upgrade).
- §5 regression tests added (enter()→nested mutation reaches same ref; non-OpenBuild stays raw).
- §6 sweep: no reactive({...manifest}) spreads, no in-place manifest.value.* mutation outside editor.
- Gate: npm run build EXIT 0; full jest suite 3814 passed / 3 failed / 3817 total — the 3 failures are
  PRE-EXISTING + unrelated (CnDashboardPageActionsMenu ×2, CnDetailPageSidebarTabs ×1; identical on the
  pristine-HEAD baseline). §5.2 live OpenBuild editor smoke + §7.3 non-OpenBuild app smoke DEFERRED
  (no running instance / no deploy to shared dev instance). §7.4 openspec CLI not run in worktree.
-->

## 1. Verify the load-bearing Vue 2.7 assumption first

- [ ] 1.1 Write a standalone jest test (no components involved) that does:
  `const obj = { a: 1 }; const r = reactive(obj); expect(r).toBe(obj)` against the pinned
  `vue@^2.7.16` — confirm Vue 2.7's Composition-API `reactive()` converts in place and returns
  the same reference (Vue 2 classic semantics), not a Vue-3-style Proxy wrapper. If this
  assertion fails, STOP — the design in design.md §2 is invalid for this Vue version and the
  change needs a different upgrade mechanism (e.g. `Vue.set`-based deep walk) before proceeding.
- [ ] 1.2 Confirm `markRaw` is exported from the `vue` package at this version and behaves as
  expected: `markRaw(obj)` then `ref(obj)` — the resulting ref's `.value` properties are NOT
  converted to getters/setters (spot-check with a jest test asserting no `__ob__` marker appears
  after `ref(markRaw(obj))`).

## 2. `useAppManifest.js` — shallow by default

- [ ] 2.1 `loadInMemory` (line ~142): change `ref(input.manifest)` to
  `shallowRef(markRaw(input.manifest))`.
- [ ] 2.2 `loadFromBackend` (line ~179): change the initial `ref(bundledManifest)` to
  `shallowRef(markRaw(bundledManifest))`; change the later `manifest.value = resolved` assignment
  (line ~249) to `manifest.value = markRaw(resolved)`.
- [ ] 2.3 Update the composable's JSDoc (`@return` block, "The returned manifest is reactive..."
  paragraph at line ~50) to describe the new shallow-by-default behavior and note that `CnAppRoot`
  upgrades it to deep-reactive when OpenBuild editing is available.
- [ ] 2.4 Run existing `useAppManifest` jest suite — confirm all backend-merge / sentinel /
  validation scenarios still pass (they read `manifest.value`'s top-level shape and the ref
  reassignment continues to trigger watchers; they should not depend on deep property-level
  reactivity).

## 3. `CnAppRoot.vue` — gated in-place upgrade

- [ ] 3.1 Add the `upgradeToEditable(manifestObj)` helper per design.md §2 (in-place `reactive()`
  call + idempotency marker).
- [ ] 3.2 Add a `watch(openBuildEditable, ..., { immediate: true })` that calls
  `upgradeToEditable(baseRef.value)` when `openBuildEditable.value` is true — reuse the existing
  `openBuildEditable` computed already defined at `CnAppRoot.vue:1023-1026` (don't duplicate the
  `useOpenBuildEditAvailability()` call).
- [ ] 3.3 Also call `upgradeToEditable(m)` inside the existing
  `watch(() => props.manifest, (m) => { if (!manifestEditor.editing.value) baseRef.value = m })`
  (line ~1018) when `openBuildEditable.value` is already true at that point (a manifest hot-swap
  while OpenBuild is available must also be upgraded — otherwise a later `props.manifest` change
  would silently reintroduce a raw object).

## 4. `useManifestEditor.js` — fallback upgrade in `enter()`

- [ ] 4.1 Add the same `upgradeToEditable` call (or accept it as an injected callback from
  `CnAppRoot` to avoid duplicating the helper) at the top of `enter()`, before the existing
  `deepClone(baseRef.value)` snapshot line.
- [ ] 4.2 Update `useManifestEditor.js`'s docblock to mention the manifest may arrive shallow/raw
  and that `enter()` is responsible for ensuring it's reactive-observable before edits begin.

## 5. Regression-proof the OpenBuild editing path (primary risk)

- [ ] 5.1 Locate or write a jest/vue-test-utils test that mounts `CnAppRoot` with
  `openBuildAvailable` forced true, enters edit mode via `useManifestEditor`, mutates a nested
  property of the live manifest (e.g. `manifest.pages[0].title = 'x'`), and asserts a descendant
  component that reads that property (e.g. via a `computed` bound to the injected `cnManifest`)
  re-renders / reflects the new value WITHOUT remounting. This is the exact scenario the original
  `useManifestEditor` docblock says would break under naive ref-swapping — prove it doesn't break
  under the shallow-then-upgrade design either.
- [ ] 5.2 Manually smoke-test OpenBuild's actual in-app editor against a locally-linked build of
  this change (not just unit tests) — open the editor, drag/resize a widget, save, confirm the
  change persists and renders live, exactly as before this change.
- [ ] 5.3 Confirm apps WITHOUT OpenBuild installed never call `upgradeToEditable` (add an
  assertion/spy in a test that `reactive()`/`Object.defineProperty` conversion is never invoked
  on the manifest object when `useOpenBuildEditAvailability()` resolves `false`).

## 6. Sweep for spread/clone patterns that would defeat `markRaw`

- [ ] 6.1 Grep `src/` for any pattern that spreads the manifest into a new reactive container
  (e.g. `reactive({ ...manifest.value })`, `{ ...props.manifest }` followed by local mutation
  expectations) — confirm none exist today per design.md's risk note; document any found and
  decide case-by-case whether they need the same shallow treatment.

## 7. Verify

- [ ] 7.1 `npm test` — full suite green, including the new tests from §1 and §5.
- [ ] 7.2 `npm run build` — no build errors from the `shallowRef`/`markRaw`/`reactive` imports
  (all are standard `vue` exports, already a peer dependency).
- [ ] 7.3 Manual smoke test: boot a non-OpenBuild app (e.g. pipelinq) and confirm the dashboard/
  index/detail pages render identically to pre-change behavior — no visual regression, no console
  warnings about reactivity.
- [ ] 7.4 `openspec validate manifest-shallow-reactivity-by-default --strict`.
