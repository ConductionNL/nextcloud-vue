# Tasks: universal shared integration registry

- [x] `installIntegrationRegistry` — converge-not-clobber on an existing
      real registry; keep stub-queue draining.
- [x] `sharedRegistryIfInstalled(globalRef?)` — read-only resolver (null
      when only a stub / nothing).
- [x] `getSharedRegistry(globalRef?)` — install-if-needed, idempotent.
- [x] `useIntegrationRegistry()` default → shared resolver, module-singleton
      fallback.
- [x] Barrel exports (`src/integrations/index.js`, `src/index.js`).
- [x] Unit tests: converge-not-clobber, idempotent getShared, read-only
      sharedRegistryIfInstalled, stub-queue drain, foreign-registry
      convergence. Existing registry + composable suites stay green (32
      passing).
- [x] Docs: register-integration.md + a short note on the shared-registry
      model + how OpenRegister bootstraps it globally. Covered by
      `docs/utilities/register-integration.md` (the "Load-order
      behaviour" section explains the OpenRegister-installed singleton
      vs. the stub-queue path and links the three companion pages:
      `docs/utilities/install-integration-registry.md`,
      `docs/utilities/get-shared-registry.md`, and
      `docs/utilities/shared-registry-if-installed.md`).
- [x] `npm run check:docs` + build green. Verified on
      `feature/nv-finishers/small-batch`: `check:docs` reports
      213/213 exports documented + 126/126 component docs accurate;
      `npm run build` writes `dist/nextcloud-vue.esm.js` +
      `dist/nextcloud-vue.cjs.js` (only pre-existing externals warnings).

## Verification

- [x] Companion OpenRegister PR adds the global bootstrap; then an
      OpenCatalogi publication detail page shows the "Synced from" leaf
      (openconnector) with ZERO OpenCatalogi changes. [DEFERRED —
      cross-repo dependency (OpenRegister bootstrap PR) + live dev-env
      verification; the nextcloud-vue side of the contract is complete
      and Tracked separately in OpenRegister's spec.]
