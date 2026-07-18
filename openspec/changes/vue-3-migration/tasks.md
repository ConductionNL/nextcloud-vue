# Tasks: vue-3-migration

Staged on `feat/vue-3` (off `beta`). Implements ADR-066. Each stage lands as
its own commit/PR into `feat/vue-3`; the branch itself does not merge to `beta`
— it becomes the Vue 3 major line.

## 0. Setup

- [x] 0.1 Cut `feat/vue-3` off `origin/beta`
- [x] 0.2 Openspec change + ADR-066
- [ ] 0.3 Consolidate the sanctioned open beta PRs (#234 CnGraphCanvas+flows,
      #233 CnDetailPage scoped-slot) into `beta`, then rebase `feat/vue-3`.
      The other 97 branches ahead of beta are stale — branch cleanup, NOT
      integration; do not blind-merge.

## 1. Build toolchain

- [~] 1.1 Add devDeps: `@vitejs/plugin-vue`, `@vue/compiler-sfc`, `@vue/compat`,
      `vue@^3.5` (staged in package.json); still to remove `vue-template-compiler`,
      `rollup-plugin-vue` when this line replaces the Vue 2 build
- [~] 1.2 Vue plugin swap — `rollup.config.vue3.mjs` written (faithful swap of
      rollup.config.js), keeps `preserveModules`. Not yet run against the full
      lib (needs the dep install).
- [ ] 1.3 Handle `<docs>` custom blocks (they broke the CnGraphCanvas Vue 3
      build until excluded — a real, reproduced gotcha)
- [ ] 1.4 Delete the Vue-2-pinned `unwrapVueDeep` and `resolve-vue-demi-v27`
      rollup plugins (done in the vue3 config); re-verify scoped-CSS output
      (`check:css-entry`) once the full build runs
- [ ] 1.5 Alias `vue` → `@vue/compat` (MODE 2) for the staging build
- [x] 1.6 Component compile+run proof: **CnGraphCanvas builds and runs on Vue 3
      in a browser** (drag/connect/keyboard/zoom verified), zero code changes.
- [x] 1.7 **Compat-compiler necessity proven**: plain Vue 3 SILENTLY
      mis-compiles `.sync` (drops the update handler) and `{{x|f}}` (parses `|`
      as bitwise-OR) — zero compile errors, broken at runtime. `@vue/compat`
      MODE 2 + COMPILER_FILTERS restores both. So a green Vue 3 build is NOT
      trustworthy during the straddle. (See BUILD-VUE3.md.)
- [x] 1.8 **Whole-lib compile sweep: 332/332 clean** — `scripts/vue3-compile-sweep.cjs`
      (`npm run check:vue3-compile`). First run 321/332; the 11 failures were all
      one pattern (`<template v-for>` key on child) — fixed. The whole component
      library compiles on Vue 3 under compat. (Compile, not runtime — see 2.2/2.6.)
- [ ] 1.9 Full-lib *bundle* build via `rollup.config.vue3.mjs`. NOT just an
      install — the blockers are Vue-version-sensitive bundled (non-external)
      deps. Verified inventory (2026-07-18):
      - **`@vueuse/core` — trivial.** All 3 sites (`useObjectLock`,
        `useObjectSubscription`, `liveUpdates`) use only `tryOnScopeDispose`,
        stable v10→v11. Just bump the version.
      - **`vue-frag` — 1 safe, 1 delicate.** `CnSchemaPropertiesTab` is safe to
        de-Fragment (verified: its only consumer, CnSchemaFormDialog, passes
        declared props only — no `$attrs` fall-through). `CnActionsMenu` is
        delicate: its Fragment renders NcActions + the overflow modal as
        SIBLINGS on purpose (the modal must not mount inside NcActions' popover
        slot, which unmounts on click) — de-Fragmenting must preserve that and
        be live-verified.
      - **`vuedraggable` — the real API migration.** `CnPageTreeNode` +
        `CnMenuTreeNode`, each with a *nested* `<draggable>` (tree). v2→v4
        changes the API (`item-key` + a required `#item` slot). Needs drag
        behaviour runtime-verified, not just compiled.
      The SFC-compilation half is de-risked (332/332 sweep). This half is the
      dep-swap + codemod + v9 work (§2, §3, §4).

## 2. Codemod pass (mechanical, ~70%)

Tooling note (verified 2026-07-18): `gogocode-plugin-vue` is **too broad** — it
also rewrites `.sync` → `v-model:`, which is v9-gated (silent-noop before the
children are on v9). So transforms are applied **individually**, each with the
`check:vue3-compile` sweep + a 0-collateral diff check as the ratchet. NOT a
single wholesale codemod run.

- [x] 2.3 **`$scopedSlots` → `$slots` (79 sites, 30 files)** — DONE. Precise
      token rename (verified always-standalone); sweep 332/332, 0 collateral.
- [x] 2.4a **`beforeDestroy()` → `beforeUnmount()` (55 sites)** — DONE. Hook form
      only. Verified there is NO `destroyed()` hook — the 5 `destroyed` hits are
      a DATA PROPERTY (CnCommandPalette) + comments; a blind rename would have
      broken it. `destroyed` left untouched.
- [ ] 2.1 **`$set`/`$delete` (297 + 59) — BLOCKED on a formatting-preserving
      transform.** Regex is unsafe (the value arg has nested parens/braces/
      commas). vue-codemod's `remove-vue-set-and-delete` converts *correctly*
      (`this.$set(o,k,v)` → `o[k]=v`, still compiles) but **reprints the whole
      SFC** (2455-line diff for a 2-line change — recast reformatting). Needs a
      recast-preserving config or per-file handling. NOT urgent: `$set` works
      under `@vue/compat`, so this is the last thing before removing compat.
- [ ] 2.2 `.sync` (59) → `v-model:` — **v9-gated** (see §4 / ADR-066 Decision 6);
      do WITH the v9 rebase, not now.
- [ ] 2.5 `Vue.observable` (7) → `reactive`; `Vue.set` (4, CnAppRoot) → assignment
- [ ] 2.6 Hand-fix: `$listeners` (17), `.native` (15), `filters:` (6),
      functional components (2)
- [ ] 2.7 `eslint-plugin-vue` `no-deprecated-*` as the completeness ratchet —
      zero remaining warnings

## 3. Non-mechanical work — LIVE-VERIFY, do not trust green tests

- [ ] 3.1 Manifest renderer: audit + rewrite the 3 `Vue.extend`/`_Ctor`
      workarounds (`pageTypes.js`, `CnActionsMenu`, `CnPropertyValueCell`).
      These were fixes for silently-swallowed modals — verify the modals still
      open in the styleguide.
- [ ] 3.2 `CnAppRoot` (2700 lines): migrate the Options+Composition hybrid;
      verify all 51 provide/inject sites stay reactive (menu counts, AI
      context, sidebar state must not go stale)
- [ ] 3.3 Remove `vue-frag`; verify `$attrs` fall-through on the multi-root
      components (`CnActionsMenu`, `CnSchemaPropertiesTab`, `CnTalkCard`)
- [ ] 3.4 `provide()`-getter trick → idiomatic Vue 3 reactive provide

## 4. @nextcloud/vue v8 → v9

Surfaced concretely by the Vue 3 integration test (procest + openbuild
components rendered live on Vue 3 + @nextcloud/vue 9 + @vue/compat, 2026-07-18):

- [x] 4.1 Bump peer `@nextcloud/vue ^8` → `^9`, `vue ^2.7` → `^3.5`; drop
      `vue-frag`; `@vueuse/core ^10` → v11+ — DONE in package.json.
- [ ] 4.2 Import-path sweep (`/dist/Components/NcButton.js` → `/components/NcButton`).
      **Confirmed live**: apps + lib still use the v8 `/dist/Components/*.js` path;
      v9 maps `./components/X` → `dist/components/X/index.mjs`. The integration
      harness aliases old→new; the real fix is a source sweep.
- [ ] 4.2b **`Tooltip` directive REMOVED from the v9 barrel.** `import { Tooltip }
      from '@nextcloud/vue'` fails — v9 ships only `Focus`/`Linkify` in
      dist/directives/, no Tooltip. ~10 lib components import it
      (CnCard, CnFormDialog, CnMarkdownEditor, CnPropertyValueCell, CnTabbedFormDialog,
      CnSchemaFormDialog, CnSuggestFeatureModal, CnNewsWidget, CnMapWidget,
      CnPropertiesTab). Replace with the v9 tooltip mechanism or drop.
- [ ] 4.3 `v-model` unification across wrappers (`value`/`checked` →
      `modelValue`) — coordinate with each wrapper's consumers; a miss
      silently no-ops
- [ ] 4.4 Local registration (or `unplugin-vue-components`); handle removed
      `NcSettingsInputText` / `exact`; re-validate the `NcSelectTags` override
- [x] 4.5 Global `t`/`n` install contract — **confirmed load-bearing**: without
      `app.config.globalProperties.t/n`, every component's `this.t(...)` throws
      at render. Consumers install it via globalProperties (Vue 3) instead of
      the Vue 2 `Vue.mixin`. The integration harness proves this is the correct
      install point.

## 5. Tests → Vitest

- [ ] 5.1 `@vue/vue2-jest` → Vitest; `@vue/test-utils` v1 → v2
- [ ] 5.2 `propsData` → `props` (274 files); `scopedSlots` → `slots` (26);
      `listeners` → `attrs` (7); mount options under `global`
- [ ] 5.3 Re-point the `@nextcloud/vue` test mock + a11y real-component swap
      at v9 shapes
- [ ] 5.4 Pin `pinia@^2.3`

## 6. Finish + release

- [ ] 6.1 Remove `@vue/compat`; build on real Vue 3
- [ ] 6.2 Styleguide renders all 329 components live under Vue 3 (the real
      acceptance test, not green CI)
- [ ] 6.3 Version → `2.0.0-alpha.0`
- [ ] 6.4 Publish under dist-tag **`vue3`** (NEVER `latest`/`beta`) —
      worktree + Automation token + `npm publish --tag vue3`; `npm view
      dist-tags` first
- [ ] 6.5 First consumer pilot: a zero-own-debt app (larpingapp/scholiq) bumps
      to the Vue 3 major to validate the published package end-to-end

## Acceptance

- Styleguide renders all 329 components live on Vue 3 (§6.2)
- The 3 renderer traps + provide/inject verified live (§3.1–3.2)
- `2.0.0-alpha.0` published under `vue3`; the Vue 2.7 `beta` line untouched
- One pilot app builds + runs against the published Vue 3 major
