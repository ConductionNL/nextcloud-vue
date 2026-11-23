# Design: flow-layout-helpers-from-root

Read at nextcloud-vue development `3e606bf10`.

## What is there

- `src/composables/flowGraphLayout.js` exports
  `FLOW_LAYOUT_COLUMN_WIDTH` (`:51`), `FLOW_LAYOUT_ROW_HEIGHT` (`:60`),
  `FLOW_LAYOUT_MARGIN` (`:67`), `FLOW_LAYOUT_TOP` (`:80`),
  `readNodePoint` (`:97`), `needsFullLayout` (`:129`),
  `layoutFlowNodes` (`:329`) and `placeLooseNodes` (`:364`). Only
  `src/composables/useFlowStore.js:28` imports them.
- Neither `src/index.js` nor `src/composables/index.js` re-exports them.
- `package.json` `exports` maps `.` to the built `dist/esm/index.js` and
  also exposes `./src/*`, which is why the deep import resolves at all.
- `tests/packaging/subpath-exports.spec.js` guards the subpath entries.

## Decisions

### D1. Export the pure helpers, not the store

The eight names above are pure functions and constants over plain node
and line arrays, with no Vue or Pinia in them, so they are safe to put on
the root. `useFlowStore` stays internal.

### D2. A test that fails when one goes missing

A packaging spec imports each name from `src/index.js` and asserts it is
a function or a number, so a refactor that drops one fails in this repo
rather than in stackiq's build.

## Files

- `src/composables/index.js`, `src/index.js`: the re-exports.
- `tests/packaging/flow-layout-exports.spec.js`: new.
