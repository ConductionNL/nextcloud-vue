# Tasks: nextcloud-vue-in-memory-manifest

## 1. Composable: branch on first argument

- [ ] 1.1 Add a runtime discriminator at the top of `useAppManifest` that branches on
  `typeof arguments[0]` — `string` enters the legacy fetch-and-merge path; non-null plain
  `object` enters the new in-memory path.
  - spec_ref: REQ-IMM-001, REQ-IMM-004
  - files_likely_affected: `src/composables/useAppManifest.js`
- [ ] 1.2 Refactor the legacy body into a private helper (e.g. `loadFromBackend(appId,
  bundledManifest, options)`) called from the string-first branch only. The in-memory
  branch MUST NOT reach this helper.
  - spec_ref: REQ-IMM-002, REQ-IMM-004
  - files_likely_affected: `src/composables/useAppManifest.js`

## 2. Composable: in-memory branch implementation

- [ ] 2.1 Implement the in-memory branch: construct `manifest = ref(input.manifest)`,
  `isLoading = ref(false)`, `validationErrors = ref(null)`, and return them. No call to
  `generateUrl`, `axios.get`, or any fetcher.
  - spec_ref: REQ-IMM-001, REQ-IMM-002
  - files_likely_affected: `src/composables/useAppManifest.js`
- [ ] 2.2 Wire the optional `validate: true` flag to call `validateManifest(input.manifest)`
  synchronously before returning. On failure, populate `validationErrors.value` with the
  error list and emit a `console.warn` whose message begins with `[useAppManifest]`. Do NOT
  throw. Do NOT replace the manifest value.
  - spec_ref: REQ-IMM-003
  - files_likely_affected: `src/composables/useAppManifest.js`, `src/utils/validateManifest.js` (import only)

## 3. TypeScript / JSDoc

- [ ] 3.1 Update the JSDoc block on `useAppManifest` to document the new overload — both
  call shapes side by side, return shape unchanged. Add a `@example` block showing the
  in-memory mount pattern (mirroring the structure of the existing positional examples).
  - spec_ref: REQ-IMM-001, REQ-IMM-003, REQ-IMM-004
  - files_likely_affected: `src/composables/useAppManifest.js`
- [ ] 3.2 If a sibling `.d.ts` for the composable exists, add a TypeScript overload signature
  for `useAppManifest(options: { manifest: object, validate?: boolean })`. If no `.d.ts`
  exists yet, JSDoc + the runtime branch are sufficient — do not introduce a new `.d.ts`
  in this change.
  - spec_ref: REQ-IMM-001
  - files_likely_affected: `src/composables/useAppManifest.js` (or sibling `.d.ts` if present)

## 4. Tests

- [ ] 4.1 Add unit test: `useAppManifest({ manifest })` returns the input manifest by
  reference, `isLoading.value === false` synchronously, `validationErrors.value === null`,
  and no fetcher / axios call is made. Use a spy on `axios.get` to assert zero calls.
  - spec_ref: REQ-IMM-001, REQ-IMM-002
  - files_likely_affected: `tests/composables/useAppManifest.spec.js` (or
    `tests/composables/use-app-manifest.spec.js` — match existing naming)
- [ ] 4.2 Add unit test: `useAppManifest({ manifest, validate: true })` with a valid
  manifest produces `validationErrors.value === null` and emits no `console.warn`.
  - spec_ref: REQ-IMM-003
  - files_likely_affected: same test file
- [ ] 4.3 Add unit test: `useAppManifest({ manifest, validate: true })` with an invalid
  manifest produces a populated `validationErrors.value` and emits a `console.warn`
  containing `[useAppManifest]`. The `manifest` ref MUST still hold the input manifest.
  - spec_ref: REQ-IMM-003
  - files_likely_affected: same test file
- [ ] 4.4 Add regression test: legacy positional signature `useAppManifest('openregister',
  bundled)` still triggers the fetcher and returns the same shape. (Existing tests should
  cover this — add an explicit assertion if missing.)
  - spec_ref: REQ-IMM-004
  - files_likely_affected: same test file

## 5. Documentation

- [ ] 5.1 Add a "Mounting an in-memory manifest" section to
  `docs/utilities/composables/use-app-manifest.md` (or `docs/utilities/composables/<kebab>.md`
  for the actual current location) showing the new overload, when to use it, and the
  validation flag. Link out to the `bootstrap-openbuilt` change as the canonical consumer.
  - spec_ref: REQ-IMM-001, REQ-IMM-003
  - files_likely_affected: `docs/utilities/composables/use-app-manifest.md`
- [ ] 5.2 Update `docs/components/cn-app-root.md` to mention that the in-memory overload is
  the supported way to mount virtual apps (rather than the historical `options.endpoint`
  redirection workaround). Mark the workaround as historical, not deprecated.
  - spec_ref: REQ-IMM-001
  - files_likely_affected: `docs/components/cn-app-root.md`

## 6. Schema docblock + version

- [ ] 6.1 Update the header docblock comment in `src/schemas/app-manifest.schema.json` (or
  the composable JSDoc that references it) to call out that manifests can be mounted
  in-memory without a backend route. One-line addition only.
  - spec_ref: REQ-IMM-001
  - files_likely_affected: `src/schemas/app-manifest.schema.json` (or composable JSDoc)
- [ ] 6.2 Bump the library `version` field in `package.json` (additive minor: e.g.
  `1.0.0-beta.30` → `1.0.0-beta.31` or `1.1.0` per current release cadence).
  - spec_ref: n/a (release housekeeping)
  - files_likely_affected: `package.json`

## 7. Verification

- [ ] 7.1 Run `npm test` — all existing + new composable tests MUST pass.
  - files_likely_affected: n/a (verification)
- [ ] 7.2 Run `npm run build` — Rollup build MUST succeed without warnings about the
  composable.
  - files_likely_affected: n/a (verification)
- [ ] 7.3 Run `npm run check:docs` — the export coverage check MUST still pass (no new
  exports added; existing `useAppManifest` doc page MUST still exist).
  - files_likely_affected: n/a (verification)
- [ ] 7.4 Run `npm run check:jsdoc` — JSDoc coverage baseline MUST NOT regress. If the
  expanded JSDoc improves coverage, run `npm run jsdoc-baselines:update` and commit the
  baseline bump.
  - files_likely_affected: `scripts/.jsdoc-baselines.json` (only if improved)
