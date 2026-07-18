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

- [ ] 1.1 Add devDeps: `@vitejs/plugin-vue`, `@vue/compiler-sfc`, `@vue/compat`,
      `vue@^3.5`; remove `vue-template-compiler`, `rollup-plugin-vue`
- [ ] 1.2 Swap the Vue plugin in `rollup.config.js`; keep `preserveModules`
- [ ] 1.3 Handle `<docs>` custom blocks (they broke the CnGraphCanvas Vue 3
      build until excluded — a real, reproduced gotcha)
- [ ] 1.4 Delete the Vue-2-pinned `unwrapVueDeep` and `resolve-vue-demi-v27`
      rollup plugins; re-verify scoped-CSS output (`check:css-entry`)
- [ ] 1.5 Alias `vue` → `@vue/compat` (MODE 2) for the staging build
- [ ] 1.6 First smoke test: build ONE clean component (CnGraphCanvas — already
      proven) through the real lib pipeline, not a scratch harness

## 2. Codemod pass (mechanical, ~70%)

- [ ] 2.1 `gogocode-plugin-vue`: `$set`/`$delete` (383) → assignment
- [ ] 2.2 `.sync` (59) → `v-model:x`
- [ ] 2.3 `$scopedSlots` (79) → `$slots`
- [ ] 2.4 `beforeDestroy`/`destroyed` (56) → `beforeUnmount`/`unmounted`
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

- [ ] 4.1 Bump peer `@nextcloud/vue ^8` → `^9`, `vue ^2.7` → `^3.5`; drop
      `vue-frag`; `@vueuse/core ^10` → v11+
- [ ] 4.2 Import-path sweep (`/dist/Components/NcButton.js` → `/components/NcButton`)
- [ ] 4.3 `v-model` unification across wrappers (`value`/`checked` →
      `modelValue`) — coordinate with each wrapper's consumers; a miss
      silently no-ops
- [ ] 4.4 Local registration (or `unplugin-vue-components`); handle removed
      `NcSettingsInputText` / `exact`; re-validate the `NcSelectTags` override
- [ ] 4.5 Update the documented global `t`/`n` install contract (app.mixin /
      globalProperties)

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
