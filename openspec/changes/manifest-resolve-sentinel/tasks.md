# Tasks: Manifest `@resolve:` sentinel

## Phase 1 — Loader

- [ ] Add `src/utils/resolveManifestSentinels.js` — a pure function
      that walks an object tree and replaces every `@resolve:{key}`
      string with the result of `getAppConfigValue(appId, key)`.
      Returns the substituted tree + a list of unresolved keys (those
      whose IAppConfig value was unset).
- [ ] Update `src/composables/useAppManifest.js` to call
      `resolveManifestSentinels(merged, appId)` AFTER the bundled +
      backend-merge phase, BEFORE the validator runs. The validator
      sees resolved values.
- [ ] Walk only `pages[].config` subtrees by default; the loader
      MUST NOT substitute sentinels in `route`, `id`, or top-level
      fields like `version`, `dependencies`, `menu[].route`.
- [ ] When a sentinel resolves to an unset/empty value, replace
      with `null` (NOT empty string) and emit a `console.warn`
      with the unresolved keys.

## Phase 2 — Schema validator + tests

- [ ] Update `src/utils/validateManifest.js` to accept `@resolve:{key}`
      as a valid string for any `string`-typed field that lives under
      a `pages[].config` path. Other paths (route, id, etc.) MUST
      reject the sentinel.
- [ ] Add `tests/utils/resolveManifestSentinels.spec.js` covering:
      - Plain string passes through unchanged
      - `@resolve:foo` replaced with `IAppConfig` value
      - `@resolve:missing` replaced with `null` + warn emitted
      - Nested object substitution (e.g. `pages[2].config.register`)
      - Sentinel in `route` MUST NOT be substituted (validator
        rejects it; the resolver leaves it intact for the
        validator to flag)
      - `@resolve:{}` (malformed, no key) ignored, returned unchanged

## Phase 3 — Spec + integration

- [ ] Write `specs/manifest-resolve-sentinel/spec.md` with:
      - Sentinel syntax requirement
      - Substitution-timing requirement (after merge, before validator)
      - Empty-state semantics (unresolved → null + warn)
      - Allowed locations (`config` only)
      - Schema validator's permissive treatment of the sentinel in
        `config`
- [ ] Update `add-json-manifest-renderer/specs/json-manifest-renderer/spec.md`
      to cross-link this change under "Subsequent extensions".
- [ ] Add an integration test in `tests/composables/useAppManifest.spec.js`
      that mounts a mock IAppConfig source + manifest with sentinels +
      asserts the loaded manifest has resolved values.

## Phase 4 — Documentation

- [ ] Update `docs/composables/use-app-manifest.md` with a section on
      the sentinel: when to use it, where it works (config blocks),
      where it doesn't (route/id/top-level), and the empty-state
      behaviour.
- [ ] Add `docs/utilities/resolve-manifest-sentinels.md` describing
      the helper API for advanced consumers.
- [ ] Update `docs/migrating-to-manifest.md` to recommend `@resolve:`
      for any `pages[].config.register` / `config.schema` value that
      varies per tenant.

## Phase 5 — Coordinated consumer updates

- [ ] After this change merges, update mydash / larpingapp /
      softwarecatalog adoption changes (already merged at Phase 3)
      to drop their local pre-processor sketches and consume the
      canonical sentinel. Track via per-app issues, not blocking PRs
      on this change.

## Phase 6 — Cross-app coordination

- [ ] Reference this change from `hydra/openspec/architecture/adr-024-app-manifest.md`
      under "Loader extensions" — the sentinel is a stable extension
      point of the canonical loader.
