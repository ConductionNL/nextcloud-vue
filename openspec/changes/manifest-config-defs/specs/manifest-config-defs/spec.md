manifest-config-defs
---
status: draft
---
# Manifest config $defs

## Purpose

Add seven formal `$defs` to the app-manifest JSON Schema documenting
the recurring config sub-shapes consumed by the existing page types
(`column`, `action`, `widgetDef`, `layoutItem`, `formField`,
`sidebarSection`, `sidebarTab`). Closes the gap where every
`pages[].config` shape was implicit (defined only by component source
code) and could not be edited or validated against a contract.

This change is intentionally additive: it adds the `$defs` vocabulary
but does NOT yet `$ref` them from inside `config` blocks. That
tightening lands in a follow-up change after the two parallel schema-
touching changes (`manifest-page-type-extensions`,
`manifest-abstract-sidebar`) merge.

## ADDED Requirements

### Requirement: The schema MUST define a `column` $def

`src/schemas/app-manifest.schema.json` MUST declare `$defs.column` as
an object schema with `additionalProperties: false`, required fields
`key` (string) and `label` (string), and the optional fields
`sortable` (boolean), `width` (string), `align` (enum:
`left | center | right`), `formatter` (string), `widget` (string),
`hidden` (boolean). The `$def` MUST carry a top-level `description`
and per-property `description`.

#### Scenario: column $def is present and well-formed
- GIVEN the manifest schema is loaded
- WHEN `schema.$defs.column` is read
- THEN it MUST be an object
- AND `schema.$defs.column.required` MUST contain `key` and `label`
- AND `schema.$defs.column.additionalProperties` MUST be `false`
- AND `schema.$defs.column.description` MUST be a non-empty string

#### Scenario: A known-good column object validates
- GIVEN a fixture `{ "key": "title", "label": "Title", "sortable": true, "width": "200px" }`
- WHEN structurally validated against `schema.$defs.column`
- THEN every required field is present
- AND every present field matches its declared type

#### Scenario: A known-bad column object is rejected
- GIVEN a fixture `{ "label": "Title", "extra": true }` (missing key, has extra key)
- WHEN structurally validated against `schema.$defs.column`
- THEN the missing `key` field MUST be flagged
- AND the unknown `extra` field MUST be flagged

### Requirement: The schema MUST define an `action` $def

`schema.$defs.action` MUST be an object schema with
`additionalProperties: false`, required fields `id` (string) and
`label` (string), and optional fields `icon` (string), `permission`
(string), `primary` (boolean), `confirm` (boolean). Top-level and
per-property `description` strings MUST be present.

#### Scenario: action $def is present and well-formed
- GIVEN the manifest schema
- WHEN `schema.$defs.action` is read
- THEN required is `["id","label"]`
- AND additionalProperties is false

#### Scenario: A known-good action validates
- GIVEN `{ "id": "edit", "label": "Edit", "icon": "Pencil", "primary": true }`
- WHEN structurally validated
- THEN it MUST be valid

#### Scenario: A known-bad action is rejected
- GIVEN `{ "id": "edit" }` (missing label)
- WHEN structurally validated
- THEN the missing `label` field MUST be flagged

### Requirement: The schema MUST define a `widgetDef` $def

`schema.$defs.widgetDef` MUST be an object schema with
`additionalProperties: false`, required fields `id` (string), `title`
(string), `type` (string), and optional fields `iconUrl` (string),
`iconClass` (string), `itemApiVersions` (array of integers), `props`
(object). Top-level and per-property `description` strings MUST be
present.

#### Scenario: widgetDef $def is present and well-formed
- GIVEN the manifest schema
- WHEN `schema.$defs.widgetDef` is read
- THEN required is `["id","title","type"]`

#### Scenario: A known-good widgetDef validates
- GIVEN `{ "id": "kpis", "title": "KPIs", "type": "custom" }`
- WHEN structurally validated
- THEN it MUST be valid

#### Scenario: A known-bad widgetDef is rejected
- GIVEN `{ "id": "kpis", "title": "KPIs" }` (missing type)
- WHEN structurally validated
- THEN the missing `type` field MUST be flagged

### Requirement: The schema MUST define a `layoutItem` $def

`schema.$defs.layoutItem` MUST be an object schema with
`additionalProperties: false`, required fields `id` (string),
`widgetId` (string), `gridX` (integer >= 0), `gridY` (integer >= 0),
`gridWidth` (integer >= 1), `gridHeight` (integer >= 1), and the
optional field `showTitle` (boolean). Top-level and per-property
`description` strings MUST be present.

#### Scenario: layoutItem $def is present and well-formed
- GIVEN the manifest schema
- WHEN `schema.$defs.layoutItem` is read
- THEN required contains `id`, `widgetId`, `gridX`, `gridY`, `gridWidth`, `gridHeight`

#### Scenario: A known-good layoutItem validates
- GIVEN `{ "id": "p1", "widgetId": "kpis", "gridX": 0, "gridY": 0, "gridWidth": 4, "gridHeight": 3 }`
- WHEN structurally validated
- THEN it MUST be valid

#### Scenario: A known-bad layoutItem is rejected
- GIVEN `{ "id": "p1", "widgetId": "kpis", "gridX": 0, "gridY": 0, "gridWidth": 0, "gridHeight": 3 }`
- WHEN structurally validated
- THEN `gridWidth: 0` MUST be flagged (minimum: 1)

### Requirement: The schema MUST define a `formField` $def

`schema.$defs.formField` MUST be an object schema with
`additionalProperties: false`, required fields `key` (string), `label`
(string), `type` (enum: `boolean | number | string | enum | password
| json`), and the optional fields `required` (boolean), `default`
(any), `enum` (array), `widget` (string), `help` (string). Top-level
and per-property `description` strings MUST be present.

#### Scenario: formField $def is present and well-formed
- GIVEN the manifest schema
- WHEN `schema.$defs.formField` is read
- THEN required contains `key`, `label`, `type`
- AND `type.enum` contains `boolean`, `number`, `string`, `enum`, `password`, `json`

#### Scenario: A known-good formField validates
- GIVEN `{ "key": "feature_x", "label": "Enable X", "type": "boolean", "default": false }`
- WHEN structurally validated
- THEN it MUST be valid

#### Scenario: A known-bad formField is rejected
- GIVEN `{ "key": "feature_x", "label": "Enable X", "type": "datetime" }`
- WHEN structurally validated
- THEN the type `datetime` MUST be flagged (not in enum)

### Requirement: The schema MUST define a `sidebarSection` $def

`schema.$defs.sidebarSection` MUST be an object schema with
`additionalProperties: false`, required fields `id` (string) and
`label` (string), and the optional fields `icon` (string), `fields`
(array of objects each with at least `{ key, label }`). Top-level and
per-property `description` strings MUST be present.

#### Scenario: sidebarSection $def is present and well-formed
- GIVEN the manifest schema
- WHEN `schema.$defs.sidebarSection` is read
- THEN required is `["id","label"]`

#### Scenario: A known-good sidebarSection validates
- GIVEN `{ "id": "metadata", "label": "Metadata", "fields": [{ "key": "owner", "label": "Owner" }] }`
- WHEN structurally validated
- THEN it MUST be valid

#### Scenario: A known-bad sidebarSection is rejected
- GIVEN `{ "label": "Metadata" }` (missing id)
- WHEN structurally validated
- THEN the missing `id` field MUST be flagged

### Requirement: The schema MUST define a `sidebarTab` $def

`schema.$defs.sidebarTab` MUST be an object schema with
`additionalProperties: false`, required fields `id` (string) and
`label` (string), and the optional fields `icon` (string), `widgets`
(array of objects), `component` (string). Top-level and per-property
`description` strings MUST be present.

The mutual exclusion of `widgets` vs `component` is intentionally NOT
enforced via `oneOf` in this change — it stays as documentation in
the descriptions; the runtime check in `validateManifest` already
catches the conflict.

#### Scenario: sidebarTab $def is present and well-formed
- GIVEN the manifest schema
- WHEN `schema.$defs.sidebarTab` is read
- THEN required is `["id","label"]`
- AND properties contains `widgets` and `component`

#### Scenario: A known-good sidebarTab validates
- GIVEN `{ "id": "details", "label": "Details", "widgets": [{ "type": "data" }] }`
- WHEN structurally validated
- THEN it MUST be valid

#### Scenario: A known-bad sidebarTab is rejected
- GIVEN `{ "label": "Details" }` (missing id)
- WHEN structurally validated
- THEN the missing `id` field MUST be flagged

### Requirement: The change MUST be additive — no $refs from config blocks

The change MUST NOT add `$ref` references from `pages[].config`
sub-properties to the new `$defs`. The `config` block keeps
`additionalProperties: true`. The schema's `version` field MUST NOT
be bumped by this change. No existing `$def` or property MUST be
modified.

#### Scenario: pages[].config is unchanged in this change
- GIVEN the manifest schema before the change
- WHEN diffed against the schema after the change
- THEN the `pages[].config` block's properties and `additionalProperties`
  MUST be identical
- AND the schema's `version` field MUST be identical
- AND existing $defs (`menuItem`, `menuItemLeaf`, `page`) MUST be
  byte-for-byte unchanged

#### Scenario: Existing fixtures keep validating
- GIVEN `tests/fixtures/manifest-valid.json`
- WHEN passed through `validateManifest()`
- THEN the result MUST be `{ valid: true, errors: [] }`

#### Scenario: Existing schema metadata tests keep passing
- GIVEN `tests/schemas/app-manifest.schema.spec.js` test suite
- WHEN run against the modified schema
- THEN every existing test MUST pass without modification
