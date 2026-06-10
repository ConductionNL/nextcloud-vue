# Tasks: registerIntegration() helper

- [x] Add `registerIntegration(descriptor, globalRef?)` to
      `src/integrations/registry.js`. Load-order-safe: live-register when
      OR's singleton is installed, else install/extend a `_queue` stub.
- [x] Export from `src/integrations/index.js` and `src/index.js` barrels.
- [x] Unit tests (`tests/integrations/registerIntegration.spec.js`):
      - OR-already-installed → registers live, appears in `integrations.list()`
      - leaf-first (no global) → stub created, descriptor queued, then
        `installIntegrationRegistry()` replays it into the singleton
      - leaf-after-another-leaf-stub → appends to the existing queue
      - delegates validation: missing tab/widget still throws (live path)
- [~] Docs: extend `docs/store/...`/integration docs with a "Path 2 — ship
      a bespoke component" section showing the helper + the per-app PHP
      `addInitScript` + the separate webpack entry. (registry doc page.)
      — DEFERRED: helper documented in JSDoc on `registerIntegration` itself
      with full load-order behaviour + an example call; a separate registry
      doc page would duplicate the JSDoc until the docusaurus build picks
      it up.
- [x] `npm run check:jsdoc` + lint green; `npm run build` green.

## Verification

- [x] `npm test -- registerIntegration` passes.
- [~] Proven end-to-end by the openconnector companion PR (global bundle
      registers a "Synced from" component that renders on an OpenCatalogi
      publication detail page). — DEFERRED: the companion PR lives in the
      consuming app repo and is not gated here.
