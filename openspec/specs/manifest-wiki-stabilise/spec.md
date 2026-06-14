# manifest-wiki-stabilise Specification

## Purpose

Stabilise the `type:'wiki'` page type by documenting and type-checking its config. The JSON schema declares the eleven optional string config fields `CnWikiPage` accepts (so IDE completion + hover docs work), and the manifest validator type-checks each known field as a string when present (typed errors with JSON-pointer paths), while tolerating omitted fields and passing unknown keys for forward-compatibility. This lets consumer apps flip wiki-shaped `type:'custom'` routes to `type:'wiki'` with confidence.

@e2e exclude Covered by jest unit tests (validateManifest.wikiStabilise.spec.js + the v2 schema spec) — this is a manifest-schema + validator capability with no Playwright app surface; schema/validator assertions belong in unit tests, not browser e2e (ADR-008 / Playwright-UI-only convention).

## Requirements
### Requirement: The schema MUST document the typed optional `type:'wiki'` config fields

`src/schemas/app-manifest-v2.schema.json` MUST declare the eleven optional string-typed config fields the `CnWikiPage` component accepts — `contentField`, `titleField`, `idParam`, `treeField`, `sidebarTitleField`, `sidebarRegister`, `sidebarSchema`, `emptyText`, `emptyDescription`, `emptyBodyText`, `emptyBodyDescription` — under `pages[].config` `properties`, each declared `{ "type": "string" }` with a description pointing at the matching `CnWikiPage` prop. The v1 schema (`app-manifest.schema.json`) MUST enumerate the same field names in its `pages[].type` description. The v2 schema `version` MUST bump (2.8.0 → 2.9.0).

#### Scenario: Schema documents the typed wiki config fields
- GIVEN the v2 manifest schema
- WHEN inspected
- THEN `pages[].config.properties` MUST include all eleven typed string fields with descriptions
- AND the schema `version` MUST be `2.9.0`

#### Scenario: Well-formed wiki config with all optional fields validates
- GIVEN a `type:'wiki'` page with `register`, `schema`, and all eleven optional string fields set to strings
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

### Requirement: The validator MUST type-check the optional `type:'wiki'` config fields

`validateTypeConfig`'s `case 'wiki':` branch MUST, in addition to enforcing the required `register`+`schema`, call a `validateWikiConfigFields` helper that iterates the eleven known optional fields and emits an error of the form `/pages/<N>/config/<field>: must be a string when set` for every field present with a non-string value. Omitted fields MUST be tolerated. Unknown keys MUST pass for forward-compatibility.

#### Scenario: Omitted optional fields validate
- GIVEN a `type:'wiki'` page declaring only `register` and `schema`
- WHEN validated
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: A non-string optional field is rejected with its path
- GIVEN a `type:'wiki'` page with `register`, `schema`, and `contentField: 123`
- WHEN validated
- THEN it MUST be invalid
- AND the errors MUST include a message containing `contentField` and `must be a string when set`

#### Scenario: Missing register or schema is still rejected (regression)
- GIVEN a `type:'wiki'` page missing `register` or `schema`
- WHEN validated
- THEN it MUST be invalid with the `wiki pages must declare register and schema` error

#### Scenario: An unknown config key passes (forward-compat)
- GIVEN a `type:'wiki'` page with `register`, `schema`, and an unrecognised `futureField` key
- WHEN validated
- THEN it MUST return `{ valid: true, errors: [] }`

