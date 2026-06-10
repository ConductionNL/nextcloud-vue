# Tasks: registerIntegration() helper

- [~] Add `registerIntegration(descriptor, globalRef?)` to — deferred to downstream cycle / fleet-wide adoption (handoff)
      `src/integrations/registry.js`. Load-order-safe: live-register when
      OR's singleton is installed, else install/extend a `_queue` stub.
- [~] Export from `src/integrations/index.js` and `src/index.js` barrels. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] Unit tests (`tests/integrations/registerIntegration.spec.js`): — deferred to downstream cycle / fleet-wide adoption (handoff)
      - OR-already-installed → registers live, appears in `integrations.list()`
      - leaf-first (no global) → stub created, descriptor queued, then
        `installIntegrationRegistry()` replays it into the singleton
      - leaf-after-another-leaf-stub → appends to the existing queue
      - delegates validation: missing tab/widget still throws (live path)
- [~] Docs: extend `docs/store/...`/integration docs with a "Path 2 — ship — deferred to downstream cycle / fleet-wide adoption (handoff)
      a bespoke component" section showing the helper + the per-app PHP
      `addInitScript` + the separate webpack entry. (registry doc page.)
- [~] `npm run check:jsdoc` + lint green; `npm run build` green. — deferred to downstream cycle / fleet-wide adoption (handoff)

## Verification

- [~] `npm test -- registerIntegration` passes. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] Proven end-to-end by the openconnector companion PR (global bundle — deferred to downstream cycle / fleet-wide adoption (handoff)
      registers a "Synced from" component that renders on an OpenCatalogi
      publication detail page).
