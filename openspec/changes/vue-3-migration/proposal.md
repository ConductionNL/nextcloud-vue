# Proposal: vue-3-migration

## Summary

Migrate `@conduction/nextcloud-vue` (329 components, Vue 2.7, Options API) to
**Vue 3**, as a new major (`2.0.0`) published under a distinct dist-tag, while
the Vue 2.7 line continues to ship to the 21 consumer apps from a maintenance
branch. Implements **ADR-066** (hydra). The library is the hard gate for the
whole fleet's Vue 3 migration — nothing else can move until this ships.

## Motivation

Vue 2.7 is end-of-life. Every maintained graph/canvas library the flow-builder
direction (ADR-065) needs is Vue-3-only, and the fleet has paid twice for the
gap (procest's `@vue-flow` editor died at 272 build errors; `CnGraphCanvas` was
hand-rolled to avoid it). The fleet **cannot** migrate app-by-app: all 21 apps
alias this lib to `../nextcloud-vue/src` (`USE_LOCAL_LIB`), and this lib
re-exports all of `@nextcloud/vue` (`src/index.js: export * from '@nextcloud/vue'`),
whose v8 (Vue 2) and v9 (Vue 3) are mutually exclusive. So this library moves
first, or nothing moves.

The migration surface is ~70% mechanical (codemod-able) and the store is Pinia
(migration-neutral). A real component — `CnGraphCanvas` — already builds and
runs on the Vue 3 runtime (verified in a browser 2026-07-18), so the path is
proven, not theoretical.

## Affected Projects

- [x] Project: `nextcloud-vue` — build toolchain, all 329 components, tests,
  the manifest-v2 renderer, and the `@nextcloud/vue` v8→v9 rebase.
- [ ] Downstream (separate changes, gated on this): each of the 21 consumer
  apps migrates after the Vue 3 major ships.

## Approach

Staged, on the `feat/vue-3` branch off `beta`:

1. **Build first.** Swap `rollup-plugin-vue` → `@vitejs/plugin-vue` +
   `@vue/compiler-sfc`; handle `<docs>` custom blocks (they broke the
   `CnGraphCanvas` Vue 3 build until excluded); keep the `preserveModules`
   chunked-ESM output. Alias `vue` → `@vue/compat` (MODE 2) as the staging
   runtime so the un-migrated components run while warnings are burned down.
2. **Codemod pass.** `gogocode-plugin-vue` for the bulk ($set → assignment,
   `.sync` → `v-model:`, `$scopedSlots` → `$slots`, lifecycle renames), with
   `eslint-plugin-vue` `no-deprecated-*` rules as the completeness ratchet.
   Hand-fix the low-count semantic ones (`.native`, `$listeners`, filters,
   functional, component `v-model`).
3. **The hard, non-mechanical work** (live-verify, do not trust green tests):
   the 3 manifest-renderer `Vue.extend`/`_Ctor` workarounds, `CnAppRoot`'s
   Options+Composition hybrid + 51-site provide/inject reactivity, and
   `vue-frag` removal (`$attrs` fall-through on dynamically-mounted
   components).
4. **Rebase on `@nextcloud/vue` v9.** Import-path sweep
   (`/dist/Components/NcButton.js` → `/components/NcButton`), the `v-model`
   unification (`value`/`checked` → `modelValue` on ~20 components), local
   registration, removed `NcSettingsInputText`/`exact`.
5. **Tests to Vitest.** `@vue/vue2-jest` → Vitest; `propsData` → `props`
   (274 files), `scopedSlots` → `slots` (26), mount options under `global`.
6. **Remove `@vue/compat`**; verify the styleguide renders all 329 components
   live under real Vue 3.
7. **Publish `2.0.0-alpha.0` under dist-tag `vue3`.** Pin `pinia@^2.3`.

## Non-negotiables (from ADR-066)

- The Vue 3 major **MUST NOT** publish under `latest` or `beta` — both are
  consumer-tracked; use `vue3`.
- Pinia **MUST NOT** float to 3.x/4.x during the straddle (drops Vue 2).
- The renderer `Vue.extend`/`_Ctor` sites and provide/inject reactivity
  **MUST** be live-verified in the styleguide.

## Out of scope

- Consumer-app migration (each is its own change, gated on the Vue 3 major).
- Replacing `CnGraphCanvas` with Vue Flow — a later optimisation the Vue 3
  runtime unlocks, not part of the migration itself.
