# Building `@conduction/nextcloud-vue` on Vue 3

This is the `feat/vue-3` line (ADR-066, openspec change `vue-3-migration`). It is
a **new major** that coexists with the Vue 2.7 `beta` line until the fleet
crosses. This document is the build-toolchain foundation: what changes, and the
evidence behind it.

## What proven so far

Two things are verified end-to-end, not assumed:

1. **A real component builds and runs on Vue 3.** `CnGraphCanvas` — unchanged —
   was built with `@vitejs/plugin-vue` (Vue 3.5.29) and driven in a browser on
   the Vue 3 runtime: drag, drag-to-connect, keyboard connect, wheel zoom, and
   the palette drop all worked, and Vue 3 proxy reactivity updated the DOM with
   no `$set`. The component code needed **zero** changes (it is Options API +
   `$emit` + named slots — all Vue-3-native).

2. **`@vue/compat`'s compiler is load-bearing, not optional.** This is the
   non-obvious one. Vue 3's compiler does **not** hard-error on the Vue-2
   template patterns this lib uses — it **silently mis-compiles** them:

   | Pattern | Plain Vue 3 compiler | `@vue/compat` compiler |
   | --- | --- | --- |
   | `:open.sync="v"` | compiles with **no `update:open` handler** — two-way binding silently dropped | emits the `onUpdate:open` handler — correct |
   | `{{ x \| filter }}` | parses `\|` as **bitwise-OR** — silently wrong output | `COMPILER_FILTERS` restores filter semantics |

   Verified with `@vue/compiler-sfc` 3.5.29 `compileTemplate`. Both cases
   returned **zero compile errors** in plain mode — so a naive Vue 3 build goes
   green and breaks at runtime across all 59 `.sync` and 6 filter sites. The
   compat compiler config (`compatConfig: { MODE: 2, COMPILER_FILTERS: true }`)
   is what keeps the migration-in-progress components correct until each site is
   rewritten.

   **Consequence:** do not trust a green Vue 3 build. Correctness during the
   straddle depends on the compat compiler flags; final correctness depends on
   removing the flags and rewriting every `.sync`/filter (openspec tasks 2.2,
   2.6).

## The toolchain swap

Relative to `rollup.config.js` (the Vue 2 build):

| Vue 2 (current) | Vue 3 |
| --- | --- |
| `rollup-plugin-vue` | `@vitejs/plugin-vue` |
| `vue-template-compiler` (dep) | `@vue/compiler-sfc` |
| `vue({ css: false })` | `vue({ template: { compilerOptions: { compatConfig: { MODE: 2, COMPILER_FILTERS: true } } } })` |
| `unwrapVueDeep()` postcss plugin | **delete** — Vue 3 SFC compiler lowers `:deep()` natively |
| `resolve-vue-demi-v27` rollup plugin | **delete** — vue-demi resolves its v3 variant |
| `vue: alias → 2.7 esm` | `vue: alias → @vue/compat` (staging), then real `vue@^3.5` |
| peer `vue ^2.7`, `@nextcloud/vue ^8`, `vue-frag` | peer `vue ^3.5`, `@nextcloud/vue ^9`; drop `vue-frag` |

`preserveModules` chunked-ESM output stays (fleet consumers depend on the
tree-shaking). The library build likely stays on Rollup; only the Vue plugin +
compiler swap.

### Two build-time gotchas already hit

- **`<docs>` custom blocks** (Vue Styleguidist) break `@vitejs/plugin-vue` until
  handled — the `CnGraphCanvas` Vue 3 build failed on its `<docs>` block until
  excluded. The Vue 3 config must strip/route custom blocks (Styleguidist itself
  moves to a Vue-3 setup, task 5).
- **Runtime `template` strings** need the `esm-bundler` build (compiler
  included); the `app-versions` recipe avoids this by using `App.vue` SFCs
  (precompiled). Not a lib-build issue, but a consumer note.

## Status

- [x] Component-level compile + run proven (`CnGraphCanvas`)
- [x] Compat-compiler necessity proven (`.sync` / filters silent mis-compile)
- [ ] Full-lib Vue 3 build (needs the dep install below + `rollup.config.vue3.mjs`)
- [ ] Codemod pass, renderer live-verify, v9 rebase, Vitest — see
      `openspec/changes/vue-3-migration/tasks.md`

## Getting a build running

```sh
# Vue 3 staging deps (not yet in package.json devDeps — add with task 1.1)
npm i -D vue@^3.5 @vue/compat@^3.5 @vitejs/plugin-vue @vue/compiler-sfc
# then: npm run build:vue3   (rollup.config.vue3.mjs)
```

The `vue`→`@vue/compat` alias + the compat compiler flags let the un-migrated
329 components build correctly while the codemod pass burns them down.
