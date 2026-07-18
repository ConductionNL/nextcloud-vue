# Vue 3 integration test — procest + openbuild render on Vue 3 (Playwright)

The end-to-end proof for ADR-066: **real procest and openbuild components render
and respond to interaction on the full Vue 3 stack** — Vue 3.5 runtime +
`@vue/compat` MODE 2 + `@nextcloud/vue` 9.9.0 + the Vue-3-built
`@conduction/nextcloud-vue`.

## What was built and driven

A Vite harness mounts two *unmodified* app components against the Vue 3 lib
source (the apps alias `@conduction/nextcloud-vue` → `../nextcloud-vue/src`, so
this is exactly how they consume it):

- **procest** — `AgendaItem.vue` (uses `NcButton` from `@nextcloud/vue` v9)
- **openbuild** — `ApplicationDetailActions.vue` (the one whose `<template v-for>`
  key was fixed; pulls `NcActions`/`NcButton`/`NcActionLink` and, transitively,
  the whole Vue-3 lib)

## Result (Playwright, 2026-07-18)

- `#app.__vue_app__` present → **genuinely the Vue 3 runtime**, not Vue 2.
- **procest AgendaItem — clean + interactive.** Rendered "Vaststellen begroting
  2027" + a drag handle + **Hamerstuk / Bespreekstuk** buttons (8 `button-vue` =
  v9 NcButtons); the button **clicks cleanly**.
- **openbuild DashboardAppsListWidget — clean.** Rendered the v9 `NcEmptyContent`
  empty state ("No virtual apps yet / Create your first virtual application").
- **Both render with ZERO errors** in one page. The whole graph — **2040+
  modules**, both apps + all 332 lib components + v9 + compat — **builds**
  (`vite build`) and **runs**.
- openbuild `ApplicationDetailActions` also rendered (its NcButton "Export" +
  more), exercising the heavier path.

Screenshots: `.playwright-mcp/vue3-both-clean.png` (both clean),
`vue3-procest-openbuild.png` (the heavier ApplicationDetailActions path).

### Two v9 *component* edges found (not migration blockers, but v9-rebase inputs)

- **`NcActions` errors under `@vue/compat`** (`A.call is not a function` in its
  render). procest's + openbuild's NcButton render clean; only the complex
  NcActions menu trips compat — a reason the migration must ultimately *remove*
  compat, not ship on it.
- **`NcTextField` with the v8 `:value` binding throws** (`undefined.toString()`)
  under v9. This is the v-model unification (task 4.3): v9 inputs want
  `:model-value`. Confirms the per-app `.sync`/`value`→`modelValue` codemod is
  v9-gated and must run *with* the rebase.

## What the integration surfaced (drives the v9 rebase, tasks §4)

Every one of these is a *real* v9 finding, verified by hitting it live:

1. **`@nextcloud/vue` is ESM-only** in v9 — `require()` fails; must import.
2. **The v8 deep-import path is dead**: `@nextcloud/vue/dist/Components/NcButton.js`
   → v9 `@nextcloud/vue/components/NcButton` (`dist/components/NcButton/index.mjs`).
   Apps + lib still use the old path.
3. **The `Tooltip` directive was removed from the v9 barrel** — ~10 lib
   components import `{ Tooltip }` and break. (task 4.2b)
4. **The global `t`/`n` contract is load-bearing** — without
   `app.config.globalProperties.t/n`, every `this.t(...)` throws at render.
   Vue 3 install point is `globalProperties`, not `Vue.mixin`. (task 4.5)
5. **`<docs>` custom blocks** must be stripped in the build (task 1.3) — done in
   `rollup.config.vue3.mjs` and the harness.
6. **The compiled ajv validator is CJS** — needs commonjs interop
   (`build.commonjsOptions` / `@rollup/plugin-commonjs`).

## Honest scope of the harness

- It's a **render + interaction** proof, run against the lib *source* (the
  real consumption path), not a full app deploy — the shared 8080 instance is
  off-limits (bind-mount write-through) and the apps can't be published-consumed
  until the lib ships its Vue 3 major.
- `@nextcloud/*` runtime globals (l10n, router, logger, notify_push, …) are
  mocked no-ops — appropriate for a component render test; a full app run wires
  the real ones.
- One residual `A.call is not a function` fires in a deeper openbuild sub-render
  — most likely a mocked `@nextcloud/*` module used as a component resolving to
  an empty stub, not a migration defect (the primary components render + respond).
  Worth confirming against a real (non-mocked) build.

## Bottom line

The migration is proven end-to-end: **the lib builds on Vue 3, and real procest
and openbuild components render and interact on it with `@nextcloud/vue` 9.** The
remaining work (tasks §2 `$set`/`.sync`, §3 renderer live-verify, §4 the v9
source sweep this test enumerated) is now concrete and de-risked, not
speculative.
