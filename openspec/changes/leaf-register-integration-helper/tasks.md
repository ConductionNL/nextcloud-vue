# Tasks: registerIntegration() helper

- [ ] Add `registerIntegration(descriptor, globalRef?)` to
      `src/integrations/registry.js`. Load-order-safe: live-register when
      OR's singleton is installed, else install/extend a `_queue` stub.
- [ ] Export from `src/integrations/index.js` and `src/index.js` barrels.
- [ ] Unit tests (`tests/integrations/registerIntegration.spec.js`):
      - OR-already-installed → registers live, appears in `integrations.list()`
      - leaf-first (no global) → stub created, descriptor queued, then
        `installIntegrationRegistry()` replays it into the singleton
      - leaf-after-another-leaf-stub → appends to the existing queue
      - delegates validation: missing tab/widget still throws (live path)
- [ ] Docs: extend `docs/store/...`/integration docs with a "Path 2 — ship
      a bespoke component" section showing the helper + the per-app PHP
      `addInitScript` + the separate webpack entry. (registry doc page.)
- [ ] `npm run check:jsdoc` + lint green; `npm run build` green.

## Verification

- [ ] `npm test -- registerIntegration` passes.
- [ ] Proven end-to-end by the openconnector companion PR (global bundle
      registers a "Synced from" component that renders on an OpenCatalogi
      publication detail page).
