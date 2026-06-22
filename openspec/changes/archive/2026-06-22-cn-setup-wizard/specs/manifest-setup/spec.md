# manifest-setup Specification

**Status:** proposed
**Scope:** nextcloud-vue (manifest schema) + hydra (canonical schema copy)
**Tier:** V1
**Depends on:** the v2 app-manifest schema; hydra ADR-042.

## Purpose

Add a declarative `setup` block to the app manifest so an app can describe its
first-time setup flow (steps, their types, and which are required) without code,
and so `CnSetupWizard` + the `CnAppRoot` setup phase can render and gate it.

## ADDED Requirements

### Requirement: REQ-SETUP-NV-001 — Manifest Declares A `setup` Block

The v2 app-manifest schema SHALL define an optional top-level `setup` object
`{ enabled: boolean, version: integer, completionConfigKey: string, steps: array }`,
where each step is `{ id, type, title, required }` plus type-specific fields, with
`additionalProperties:false` on the block and on each step, a closed `type` enum
(`info` | `config-fields` | `choice` | `run-action` | `summary` | `component`), and
unique step `id`s. The identical definition SHALL exist in both
`nextcloud-vue/src/schemas/app-manifest-v2.schema.json` and the canonical
`hydra/scripts/schemas/app-manifest-v2.schema.json`.

#### Scenario: A well-formed setup manifest validates

- **GIVEN** a manifest with a `setup` block whose steps use only allowed types
- **WHEN** it is validated against the v2 schema (`validateManifest` / the gate)
- **THEN** validation SHALL pass

#### Scenario: A malformed setup step fails

- **GIVEN** a manifest with a setup step of an unknown `type` or an extra property
- **WHEN** it is validated
- **THEN** validation SHALL fail with an `additionalProperties` / enum error

### Requirement: REQ-SETUP-NV-002 — Step Types Carry Their Binding

Each `setup` step type SHALL declare the fields it binds: `config-fields` a `schema`
(ref or inline JSON Schema) and/or `configKeys`; `choice` a `configKey` + `options[]`
(+ optional `multiple`); `run-action` an `action` id; `summary` an optional
`healthCheck` boolean; `component` a `component` name. Every step SHALL carry a
`required` boolean (default false).

#### Scenario: Required flag is expressible per step

- **GIVEN** a setup block with a required `choice` step and an optional `run-action` step
- **WHEN** validated
- **THEN** both SHALL be accepted and the `required` flags preserved for the renderer
