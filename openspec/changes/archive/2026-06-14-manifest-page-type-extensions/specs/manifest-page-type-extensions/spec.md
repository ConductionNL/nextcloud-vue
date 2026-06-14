manifest-page-type-extensions
---
status: draft
---
# Manifest page-type extensions

## Purpose

Extend the closed `pages[].type` enum in the app-manifest schema
(currently `index | detail | dashboard | custom`) with four new
declarative built-ins: `logs`, `settings`, `chat`, `files`. Closes
the audit-driven gap where 17 of 30 routes in the openregister
adoption manifest required `type:"custom"` because no built-in fit.

## ADDED Requirements

### Requirement: The schema MUST accept four new `pages[].type` values

`src/schemas/app-manifest.schema.json` MUST extend the `pages[].type` enum to include `logs`, `settings`, `chat`, `files` alongside the existing `index | detail | dashboard | custom`. The schema's `version` field MUST bump from `1.0` to `1.1`. v1.0 manifests (which don't reference the new values) MUST continue validating without changes.

#### Scenario: Manifest with new types validates
- GIVEN a manifest declaring `pages[0].type = "logs"`, `pages[1].type = "settings"`, `pages[2].type = "chat"`, `pages[3].type = "files"`, each with valid config
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: v1.0 manifest still validates against v1.1 schema
- GIVEN a manifest using only the original four types (`index | detail | dashboard | custom`)
- AND `$schema` URL points at the canonical schema
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }` — no new error from the schema bump

### Requirement: `logs` pages MUST consume `register|schema|source` config

A `pages[]` entry with `type: "logs"` MUST include `config.register` + `config.schema` (OR-backed log) OR `config.source` (custom URL). Validation MUST reject `logs` pages missing both shapes.

#### Scenario: Valid logs page with register+schema
- GIVEN `{type: "logs", config: {register: "audit", schema: "event"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Valid logs page with source URL
- GIVEN `{type: "logs", config: {source: "/api/my-logs"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid logs page with neither
- GIVEN `{type: "logs", config: {}}`
- WHEN validated
- THEN MUST return error `pages[N].config: must declare register+schema or source`

### Requirement: `settings` pages MUST consume `sections[]` config

A `pages[]` entry with `type: "settings"` MUST include `config.sections: array` where each section has `{title: string, fields: array}`. The `saveEndpoint` field is optional; default applies if absent.

#### Scenario: Valid settings page
- GIVEN `{type: "settings", config: {sections: [{title: "x", fields: [{key: "y", type: "boolean"}]}]}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid settings page with empty sections
- GIVEN `{type: "settings", config: {sections: []}}`
- WHEN validated
- THEN MUST return error: `pages[N].config.sections: must contain at least 1 section`

### Requirement: `chat` pages MUST consume `conversationSource|postUrl` config

A `pages[]` entry with `type: "chat"` MUST include `config.conversationSource` (NC Talk embed) OR `config.postUrl` (custom thread API). The `schema` field is optional (only for OR-backed conversations).

#### Scenario: Valid chat page with NC Talk source
- GIVEN `{type: "chat", config: {conversationSource: "/api/conversations/123"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid chat page missing both URL fields
- GIVEN `{type: "chat", config: {}}`
- WHEN validated
- THEN MUST return error: `pages[N].config: must declare conversationSource or postUrl`

### Requirement: `files` pages MUST consume `folder` config

A `pages[]` entry with `type: "files"` MUST include `config.folder: string`. The `allowedTypes` field is optional.

#### Scenario: Valid files page
- GIVEN `{type: "files", config: {folder: "/myapp/uploads"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid files page missing folder
- GIVEN `{type: "files", config: {}}`
- WHEN validated
- THEN MUST return error: `pages[N].config.folder: required`

### Requirement: `CnLogsPage` MUST be the default `logs` renderer

`CnPageRenderer` MUST dispatch `type: "logs"` pages to `CnLogsPage`. The component MUST: (a) when `config.register` + `config.schema` are set, fetch via `useObjectStore`; (b) when only `config.source` is set, fetch via `axios.get(config.source)`; (c) render a `CnDataTable` with columns `[timestamp, actor, action, target, details]` (overridable via `config.columns`); (d) honour `headerComponent` / `actionsComponent` / generic `slots` from `pages[]`.

#### Scenario: CnLogsPage fetches via store when OR-backed
- GIVEN `<CnLogsPage register="audit" schema="event">`
- WHEN the component mounts
- THEN it MUST call `useObjectStore` with `'audit-event'` as the type
- AND it MUST NOT issue a direct `axios.get` call

#### Scenario: CnLogsPage fetches via axios when only source set
- GIVEN `<CnLogsPage source="/api/my-logs">`
- WHEN the component mounts
- THEN it MUST issue `axios.get('/api/my-logs')`
- AND it MUST NOT call `useObjectStore`

### Requirement: `CnSettingsPage` MUST render sections + save via configured endpoint

`CnPageRenderer` MUST dispatch `type: "settings"` pages to `CnSettingsPage`. The component MUST loop `config.sections`, render a `CnSettingsCard` per section, and a `CnSettingsSection` per field group. Saves issue `axios.put(config.saveEndpoint, formData)`. Default `saveEndpoint` is `/index.php/apps/{appId}/api/settings`.

#### Scenario: Save calls the declared endpoint
- GIVEN `<CnSettingsPage sections="..." saveEndpoint="/api/custom-settings">`
- WHEN the user clicks save
- THEN the component MUST issue `PUT /api/custom-settings`

### Requirement: `CnChatPage` MUST embed an NC Talk conversation

`CnPageRenderer` MUST dispatch `type: "chat"` to `CnChatPage`. v1 implementation: render an `<iframe>` to `config.conversationSource`. v2+ MAY introduce a native thread renderer; the `<iframe>` is the v1 baseline.

#### Scenario: Chat page renders an iframe
- GIVEN `<CnChatPage conversationSource="/talk/abc">`
- WHEN the component mounts
- THEN the rendered DOM MUST contain `<iframe src="/talk/abc" />`

### Requirement: `CnFilesPage` MUST render a file-browser scoped to `folder`

`CnPageRenderer` MUST dispatch `type: "files"` to `CnFilesPage`. The component MUST scope to `config.folder` and honour `config.allowedTypes` as a MIME-type filter when present.

#### Scenario: Files page scoped to folder
- GIVEN `<CnFilesPage folder="/myapp/uploads" allowedTypes={["application/pdf"]}>`
- WHEN the component mounts
- THEN the file browser MUST list `/myapp/uploads`
- AND only `application/pdf` files MUST be visible

### Requirement: All four new types MUST honour `headerComponent` / `actionsComponent` / `slots`

Each new built-in component (`CnLogsPage`, `CnSettingsPage`, `CnChatPage`, `CnFilesPage`) MUST resolve `pages[].headerComponent` and `pages[].actionsComponent` via the `customComponents` registry, and MUST forward `pages[].slots` as scoped slots. This mirrors the existing `index | detail | dashboard` types.

#### Scenario: Logs page with custom header
- GIVEN `pages[0]` is `{type: "logs", headerComponent: "MyLogsHeader", config: {...}}`
- AND the consumer registers `MyLogsHeader` in `CnAppRoot`'s `customComponents`
- WHEN the page mounts
- THEN `MyLogsHeader` MUST render in the page's header slot

### Requirement: The validator MUST surface clear errors for missing per-type config fields

When `validateManifest()` rejects a page for a missing required `config` field, the error MUST include the JSON-path to the offending field (`pages[N].config.<field>: <reason>`) so the consumer can fix it without consulting the schema source.

#### Scenario: Clear error path for missing logs config
- GIVEN a manifest with `pages[2] = {type: "logs", config: {}}`
- WHEN `validateManifest()` runs
- THEN errors MUST include `pages[2].config: must declare register+schema or source`
