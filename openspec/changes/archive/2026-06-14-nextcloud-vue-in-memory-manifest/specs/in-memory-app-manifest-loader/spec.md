# Spec: in-memory-app-manifest-loader

## ADDED Requirements

### Requirement: REQ-IMM-001 In-memory call shape

The `useAppManifest` composable SHALL accept a single options object as its first argument
of the shape `{ manifest: object, validate?: boolean }`. When the first argument is a plain
object (not a string), the composable MUST enter the in-memory branch and MUST NOT execute
any backend fetch. The returned `manifest` ref MUST hold the exact object passed in (by
reference; the composable MUST NOT clone or mutate it).

The composable MUST return the canonical four-property shape
`{ manifest, isLoading, validationErrors, unresolvedSentinels }`:

- `manifest` — `Ref<object>` initialised to the input `manifest`
- `isLoading` — `Ref<boolean>` set to `false` immediately because no async work is queued
- `validationErrors` — `Ref<string[]|null>` initialised to `null`, populated only by the
  validation requirement below
- `unresolvedSentinels` — `Ref<string[]>` initialised to `[]`; sentinel resolution is a
  backend-merge concern and does not run on in-memory manifests, so this ref always
  remains empty in the in-memory branch

#### Scenario: Consumer passes a manifest object without `validate`

- **GIVEN** a consumer calls `useAppManifest({ manifest: { version: '1.0.0', menu: [], pages: [] } })`
- **WHEN** the composable executes
- **THEN** the returned `manifest.value` MUST equal the input manifest object
- **AND** the returned `isLoading.value` MUST be `false`
- **AND** the returned `validationErrors.value` MUST be `null`
- **AND** no HTTP request MUST be issued (no call to `axios.get`, no call to `generateUrl`)

#### Scenario: First argument is a plain object

- **GIVEN** the first argument is `{ manifest: { version: '1.0.0', menu: [], pages: [] } }`
- **WHEN** `useAppManifest` is invoked
- **THEN** the composable MUST detect the in-memory call shape (because `typeof arguments[0] === 'object'`)
- **AND** the composable MUST NOT call the legacy fetch-and-merge branch
- **AND** the composable MUST NOT require an `appId` argument

### Requirement: REQ-IMM-002 No backend fetch in the in-memory branch

When invoked via the in-memory call shape, the composable SHALL NOT issue any HTTP request,
SHALL NOT compute any backend endpoint URL, and SHALL NOT invoke the optional fetcher. The
in-memory branch MUST be entirely synchronous from the caller's perspective: the returned
`isLoading` ref MUST be `false` from the first reactive read.

This is orthogonal to the existing fetch-and-merge flow (REQ-JMR-002 in the
`json-manifest-renderer` capability): the in-memory branch is a separate code path; calling
it MUST NOT trigger the bundled-load → backend-merge → validate pipeline.

#### Scenario: In-memory branch performs no IO

- **GIVEN** a consumer calls `useAppManifest({ manifest: { version: '1.0.0', menu: [], pages: [] } })`
- **WHEN** the composable executes
- **THEN** no call MUST be made to `axios.get` from `@nextcloud/axios`
- **AND** no call MUST be made to `generateUrl` from `@nextcloud/router`
- **AND** no `options.fetcher` MUST be invoked even if one is theoretically present

#### Scenario: `isLoading` is false synchronously

- **GIVEN** a consumer calls the in-memory call shape
- **WHEN** the caller reads `isLoading.value` immediately after invocation (same microtask)
- **THEN** the value MUST be `false`
- **AND** no `await` or async tick MUST be required to settle the ref

### Requirement: REQ-IMM-003 Optional client-side pre-mount validation

When the in-memory call shape includes `validate: true`, the composable SHALL call
`validateManifest(manifest)` synchronously before returning. If validation fails, the returned
`validationErrors` ref MUST be populated with the error list returned by `validateManifest`,
and the composable MUST emit a `console.warn` listing the errors. The returned `manifest`
ref MUST still hold the input manifest unchanged — validation is informational, not blocking,
to keep behavioural parity with the existing fetch-and-merge flow.

When `validate` is `false`, `undefined`, or omitted, the composable MUST NOT invoke
`validateManifest`, and `validationErrors.value` MUST remain `null`.

#### Scenario: `validate: true` with a valid manifest

- **GIVEN** a consumer calls `useAppManifest({ manifest: <valid manifest>, validate: true })`
- **WHEN** the composable executes
- **THEN** the composable MUST invoke `validateManifest` exactly once with the input manifest
- **AND** the returned `validationErrors.value` MUST be `null`
- **AND** no `console.warn` MUST be emitted
- **AND** the returned `manifest.value` MUST equal the input manifest

#### Scenario: `validate: true` with an invalid manifest

- **GIVEN** a consumer calls `useAppManifest({ manifest: <invalid manifest>, validate: true })`
- **AND** `validateManifest` returns `{ valid: false, errors: ['menu/0 must have property id'] }`
- **WHEN** the composable executes
- **THEN** the returned `validationErrors.value` MUST equal `['menu/0 must have property id']`
- **AND** the composable MUST emit a `console.warn` whose message includes the prefix
  `[useAppManifest]` and the errors list
- **AND** the returned `manifest.value` MUST still equal the input manifest (validation is non-blocking)
- **AND** the returned `isLoading.value` MUST be `false`

#### Scenario: `validate` omitted skips validation

- **GIVEN** a consumer calls `useAppManifest({ manifest: <any manifest> })` (no `validate` key)
- **WHEN** the composable executes
- **THEN** `validateManifest` MUST NOT be invoked
- **AND** `validationErrors.value` MUST be `null`

### Requirement: REQ-IMM-004 Legacy positional signature preserved

The composable SHALL preserve the existing positional signature `useAppManifest(appId, bundledManifest, options?)` unchanged, and MUST discriminate between the two call shapes by inspecting `typeof arguments[0]` — a `string` enters the legacy fetch-and-merge branch; a non-null `object` enters the new in-memory branch. No existing consumer (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash, decidesk, docudesk, larpingapp, softwarecatalog) MUST require any code change.

#### Scenario: Legacy string-first call shape still works

- **GIVEN** a consumer calls `useAppManifest('openregister', bundledManifest)`
- **WHEN** the composable executes
- **THEN** the composable MUST enter the legacy branch
- **AND** the composable MUST issue an HTTP request via the configured fetcher to
  `/index.php/apps/openregister/api/manifest`
- **AND** the returned shape MUST be `{ manifest, isLoading, validationErrors, unresolvedSentinels }` as before
- **AND** all existing REQ-JMR-002 scenarios in the `json-manifest-renderer` capability MUST continue to hold
