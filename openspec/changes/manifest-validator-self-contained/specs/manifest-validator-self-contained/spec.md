# manifest-validator-self-contained Delta

## Purpose

Make the manifest validator work in every consumer bundle, so a backend
manifest delta is applied and a failure is visible.

## ADDED Requirements

### Requirement: The compiled validator needs no runtime module

The generated `src/utils/validateManifestV2.compiled.js` SHALL contain no
`require(` call. Every Ajv runtime helper and every ajv-formats format it uses
SHALL be inlined at build time, and the build SHALL fail when a `require(`
survives. Validation results SHALL be unchanged.

#### Scenario: A consumer's production bundle validates a manifest

- **GIVEN** a production webpack bundle that imports `validateManifest` from `dist/esm` with the package `sideEffects` allowlist in force
- **WHEN** it validates a manifest that holds a length-checked string
- **THEN** it returns a result and does not throw
- @e2e exclude a bundling property, not a browser one; covered by the jest
  assertion that the compiled source holds no `require(` and by the bundle
  probe recorded in the PR

#### Scenario: Length checks still apply

- **GIVEN** a manifest whose `nav.help.label` is an empty string
- **WHEN** it is validated
- **THEN** it is invalid
- @e2e exclude pure validation behaviour; covered by
  `tests/composables/useAppManifestDeltaNav.spec.js`

### Requirement: A backend manifest delta reaches the navigation

`useAppManifest` with `mergeStrategy: 'delta'` SHALL publish the merged
manifest, and `CnAppNav` SHALL render what the delta added: a caption's
`href` as its pencil link and new entries. When resolving the manifest throws,
`useAppManifest` SHALL keep the bundled manifest and SHALL log a warning that
names the error.

#### Scenario: The case types a user chose appear under their caption

- **GIVEN** a bundled caption `MyCaseTypesCaption` without `href`
- **AND** `/api/manifest` answering that caption with an `href` and an entry `ct-<uuid>`
- **WHEN** the app root renders after the delta resolved
- **THEN** the caption shows its pencil link and the `ct-<uuid>` entry renders
- @e2e exclude covered by `tests/composables/useAppManifestDeltaNav.spec.js`
  through the real composable, CnAppRoot and CnAppNav; the consuming app's
  live check covers the browser

#### Scenario: A failure is reported

- **GIVEN** a manifest whose resolution throws past the fetch
- **WHEN** `useAppManifest` settles
- **THEN** the bundled manifest stays and a warning names the error
- @e2e exclude covered by `tests/composables/useAppManifestDeltaNav.spec.js`
