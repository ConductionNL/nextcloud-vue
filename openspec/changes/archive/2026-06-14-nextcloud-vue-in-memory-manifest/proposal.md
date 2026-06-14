---
kind: code
depends_on: []
chain:
  - bootstrap-openbuilt           # consumer (lives in openbuilt repo)
  - nextcloud-vue-in-memory-manifest  # THIS spec
---

# Proposal: nextcloud-vue-in-memory-manifest

## Why

`useAppManifest(appId, bundledManifest, options?)` always issues an asynchronous fetch against
`/index.php/apps/{appId}/api/manifest` (or `options.endpoint`) and deep-merges the result over
the bundled manifest. That signature assumes every consumer ships a static `manifest.json` plus
an optional backend override endpoint. The OpenBuilt app builder breaks that assumption: it
mounts *virtual* apps whose manifest is constructed in memory from store state and never lives
on a backend route. Today OpenBuilt's `BuilderHost.vue` works around the missing overload by
pointing `options.endpoint` at a per-slug fake URL (see openbuilt
[`bootstrap-openbuilt/design.md`](https://github.com/ConductionNL/openbuilt/blob/main/openspec/changes/bootstrap-openbuilt/design.md)
Decision 4). That bridge is temporary; the clean API is a direct in-memory overload.

This spec adds that overload to `@conduction/nextcloud-vue` so OpenBuilt and any future
virtual-app-host consumer (e.g. third-party apps that embed OpenBuilt-style mounting) can pass
the manifest object directly without forcing a backend endpoint per virtual app.

## What Changes

- **NEW overload form**: `useAppManifest({ manifest, validate? })` accepts a single options
  object whose `manifest` field is the canonical, in-memory manifest. No HTTP fetch is
  performed in this branch — the returned `manifest` ref is the value passed in.
- **Optional pre-mount validation**: when the new overload is called with `validate: true`,
  the composable calls `validateManifest()` synchronously before returning. Validation errors
  surface on the `validationErrors` ref (matching the existing 3-tuple return shape:
  `{ manifest, isLoading, validationErrors }`). `isLoading` is `false` immediately because
  no asynchronous work happens.
- **Existing positional signature stays**: `useAppManifest(appId, bundledManifest, options?)`
  continues to work unchanged. Discrimination is done on `typeof arguments[0]`: a string
  enters the legacy fetch-and-merge branch; an object enters the new in-memory branch. Both
  branches return the same shape, so consumers see one stable API surface.
- **TypeScript / JSDoc types updated** to model the two-call-shape via an overload signature
  (or runtime branch on the first argument). The canonical `app-manifest.schema.json`
  docblock is updated to call out the in-memory mount path.
- **Documentation**: `docs/components/cn-app-root.md` and
  `docs/utilities/composables/use-app-manifest.md` gain a "Mounting an in-memory manifest"
  section. The OpenBuilt workaround documented in CnAppRoot.md is marked as historical.
- **Unit tests**: cover (a) basic in-memory return, (b) `validate: true` happy path,
  (c) `validate: true` invalid manifest yields populated `validationErrors`, (d) the legacy
  signature still functions unchanged (regression).

No prop, event, or slot removals. Fully backwards-compatible. No theming impact.

## Capabilities

### New Capabilities

- `in-memory-app-manifest-loader`: defines the in-memory call shape of `useAppManifest` —
  when the first argument is an options object containing `manifest`, the composable returns
  the manifest synchronously without any backend fetch, with optional pre-mount validation.

### Modified Capabilities

<!-- The existing capability `json-manifest-renderer` already documents the backend-merge
     flow. This change is orthogonal: it adds a new entry path, not a modification of the
     existing fetch-and-merge requirements. Therefore no delta to the existing spec is
     needed — the new capability stands alongside it. -->

## Impact

- **Affected code (single source file)**: `src/composables/useAppManifest.js` (branch on first
  argument shape). Optionally a sibling `.d.ts` if/when types are extracted.
- **Affected docs**: `docs/components/cn-app-root.md`,
  `docs/utilities/composables/use-app-manifest.md`. New section in each.
- **Affected tests**: `tests/composables/useAppManifest.spec.js` (or
  `tests/composables/use-app-manifest.spec.js`) — four new cases.
- **Schema docblock**: header comment in `src/schemas/app-manifest.schema.json` (or the
  composable JSDoc that references it) calls out the in-memory mount path.
- **Consumer apps**: OpenBuilt (immediate consumer — collapses its `BuilderHost.vue`
  workaround); no impact on OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash, decidesk,
  docudesk, larpingapp, mydash, softwarecatalog, or any other current consumer because the
  legacy positional signature is preserved verbatim.
- **Library version**: minor bump (additive overload, no breaking change).
- **Backward compatibility**: 100% preserved.
- **Theming**: no impact (no UI changes).
