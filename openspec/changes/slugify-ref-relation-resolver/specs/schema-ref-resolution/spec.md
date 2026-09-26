# Schema $ref resolution — Spec

## Purpose

Specifies how this library turns an OpenRegister schema `$ref` (authored as
the referenced schema's title, e.g. `ReportPeriod`) into the schema **slug**
segment of an objects-API path (`report-period`) — the one conversion every
`$ref`-consuming resolver in the library must apply, so that a multi-word
schema title never 404s while a single-word one happens to work.

**Files**: `src/utils/schemaRefSlug.js` (the helper), `src/utils/schema.js`
(`normalizeRef()`), `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`
(`relationProp()`), `src/utils/actionsDispatcher.js`
(`resolveObjectOpType()`).

**Cross-references**: `manifest-form-logic` (`CnFormDialog`'s reference
pickers consume `field.reference.schema`, built by `normalizeRef()`),
`manifest-detail-related-and-aggregates` (the related-widget family),
`store` (`useObjectStore`'s objects-API URL builder consumes the type
registry this resolution feeds).

## ADDED Requirements

### Requirement: REQ-SRR-1 — `schemaRefSlug()` kebab-cases a `$ref` title into the objects-API slug

`schemaRefSlug(ref)` SHALL convert a `$ref` value into the slug segment
OpenRegister's objects API resolves: lowercase, with a dash inserted at
every PascalCase/camelCase word boundary and every run of non
`[a-z0-9]` characters (spaces, punctuation, parentheses) folded to a
single dash, leading/trailing dashes trimmed. It SHALL be idempotent — a
value that is already a correct slug SHALL pass through unchanged. It
SHALL take the tail of a JSON-Pointer `$ref` (`#/components/schemas/<title>`)
before slugifying. A numeric schema id SHALL pass through unchanged
(slugifying a number has no meaning; OpenRegister's objects API accepts
either the slug or the numeric id in the same path position). `null`,
`undefined`, `NaN`, and the empty string SHALL degrade to `''`.

#### Scenario: Multi-word PascalCase title

- **GIVEN** `ref = 'ReportPeriod'`
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `'report-period'`

#### Scenario: Single-word title needs no dash

- **GIVEN** `ref = 'Cohort'`
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `'cohort'`

#### Scenario: Already-kebab input is unchanged (idempotent)

- **GIVEN** `ref = 'report-period'`
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `'report-period'`

#### Scenario: Spaces and parentheses fold to single dashes

- **GIVEN** `ref = 'Praktijkovereenkomst (POK)'`
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `'praktijkovereenkomst-pok'`

#### Scenario: A JSON-Pointer $ref is reduced to its tail before slugifying

- **GIVEN** `ref = '#/components/schemas/ReportPeriod'`
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `'report-period'`

#### Scenario: A numeric schema id passes through unchanged

- **GIVEN** `ref = 85` (a number)
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `85` (the same number, not a string)

#### Scenario: Absent input degrades to the empty string

- **GIVEN** `ref` is `null`, `undefined`, `NaN`, or `''`
- **WHEN** `schemaRefSlug(ref)` is called
- **THEN** it returns `''`

### Requirement: REQ-SRR-2 — Form field resolvers use the slugged schema, not the raw $ref title

`fieldsFromSchema()`'s `reference.schema` descriptor (built by
`normalizeRef()` in `src/utils/schema.js`) SHALL carry the value
`schemaRefSlug()` returns for the property's `$ref` (or `items.$ref` for an
array reference), never the raw `$ref` string. Every `CnFormDialog`
resolver that reads `field.reference.schema` — `fetchReferenceOptions()`,
`resolveReferenceLabel()`, `applyTemplateFill()`, and dynamic-property
prefill — SHALL therefore register and fetch the objects-API type using the
slug, with no change required in `CnFormDialog` itself.

#### Scenario: A multi-word $ref resolves to a working picker

- **GIVEN** a schema property `{ type: 'string', format: 'uuid', $ref: 'ReportPeriod' }`
- **WHEN** `fieldsFromSchema()` builds that field's descriptor
- **THEN** `field.reference.schema` is `'report-period'`
- **AND** `CnFormDialog`'s `fetchReferenceOptions()` for that field registers
  and fetches the object type under `'report-period'`, not `'ReportPeriod'`

### Requirement: REQ-SRR-3 — The related widget resolves its relation target from the slugged schema

`CnObjectDataWidget`'s `relationProp()` SHALL build its
`{ target: '<register>/<slug>' }` relation descriptor from
`schemaRefSlug()`'s output for the property's `$ref` (or `items.$ref`),
never the raw `$ref` title. `loadRelationOptions()` and `resolveRelations()`
SHALL therefore fetch the objects API at the slugged path.

#### Scenario: A multi-word relation resolves and no longer 404s

- **GIVEN** a `ReportCard` schema property `reportPeriodId: { $ref: 'ReportPeriod' }`
  displayed inside a detail page whose object context names register `learniq`
- **WHEN** `relationProp()` is called for that property
- **THEN** it returns `{ target: 'learniq/report-period' }`
- **AND** `resolveRelations()` fetches
  `/apps/openregister/api/objects/learniq/report-period/{id}`, which
  resolves (200), not `/apps/openregister/api/objects/learniq/ReportPeriod/{id}`
  (404)

#### Scenario: A single-word relation keeps working exactly as before

- **GIVEN** a schema property `cohortId: { $ref: 'Cohort' }`
- **WHEN** `relationProp()` is called for that property
- **THEN** it returns `{ target: '<register>/cohort' }`, matching the
  already-working single-word behaviour

### Requirement: REQ-SRR-4 — The shared FK-resolve type resolver slugifies its schema, idempotently

`resolveObjectOpType()` in `src/utils/actionsDispatcher.js` SHALL slugify
`source.schema` via `schemaRefSlug()` before comparing it against an
existing object-type registration and before registering a new one. This
is the resolver behind `CnFkResolveCell` (used by `CnObjectListWidget`'s
grouped-row headers and `CnCellRenderer`'s `fkResolve` cell widget) and by
`CnStatWidget`, `CnChartWidget`, `CnActionButtons`, `CnStagesWidget`, and
`CnWidgetObjectTable`. Because the conversion is idempotent, a caller that
already passes a correct slug SHALL see no change in behaviour.

#### Scenario: A PascalCase schema title resolves and registers under its slug

- **GIVEN** a store with no matching registration
- **WHEN** `resolveObjectOpType(store, { register: 'learniq', schema: 'ReportPeriod' })` is called
- **THEN** it returns `'learniq/report-period'`
- **AND** the store registers that type with `schema: 'report-period'`, not `'ReportPeriod'`

#### Scenario: An already-correct slug is unaffected

- **GIVEN** a store with no matching registration
- **WHEN** `resolveObjectOpType(store, { register: 'crm', schema: 'lead' })` is called
- **THEN** it returns `'crm/lead'`, exactly as before this change

#### Scenario: An existing registration matched by its canonical slug hint still short-circuits

- **GIVEN** a store whose registry holds one entry keyed by an opaque alias,
  carrying `registerSlug: 'learniq'` and `schemaSlug: 'report-period'`
- **WHEN** `resolveObjectOpType(store, { register: 'learniq', schema: 'ReportPeriod' })` is called
- **THEN** it returns that alias, and no new registration is made
