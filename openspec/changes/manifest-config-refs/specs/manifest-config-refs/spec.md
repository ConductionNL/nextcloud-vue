manifest-config-refs
---
status: draft
---
# Manifest config $refs

## Purpose

Tighten the app-manifest JSON Schema by `$ref`-ing the seven existing
`$defs` (`column`, `action`, `widgetDef`, `layoutItem`, `formField`,
`sidebarSection`, `sidebarTab`) from the recurring `pages[].config`
sub-properties they describe. Closes the gap left intentionally open
by `manifest-config-defs` (which added the `$defs` additively to
avoid sibling-branch conflicts).

After this change, editor autocomplete, build-time Ajv validation,
and CI lint catch shape violations on `pages[].config.columns[]`,
`config.actions[]`, `config.widgets[]`, `config.layout[]`,
`config.sections[].fields[]`, `config.sidebar.columnGroups[]`,
`config.sidebar.tabs[]`, and `config.sidebarProps.tabs[]` against the
typed `$defs`. The change is intentionally *non-breaking* on
documented manifests — a `oneOf` admits the legacy string-shorthand
form for `columns[]` that two existing fixtures use.

## ADDED Requirements

### Requirement: The schema MUST $ref `column` from index/logs config columns

`src/schemas/app-manifest.schema.json` MUST declare
`$defs.page.properties.config.properties.columns.items` as a
`oneOf: [{type:"string"}, {$ref: "#/$defs/column"}]` schema. The
string branch admits the legacy shorthand
(`columns: ["title", "status", "deadline"]`) used by existing
fixtures; the `$ref` branch admits the typed object form
(`{ key, label, … }`).

The same wiring applies wherever `config.columns[]` appears for the
`index` and `logs` page types. The outer `pages[].config` object
keeps `additionalProperties: true`.

#### Scenario: a string-shorthand columns array validates
- GIVEN an index page with `config: { columns: ["title", "status"] }`
- WHEN the schema's `columns.items` is checked
- THEN every string item passes the `string` branch of `oneOf`
- AND `validateManifest()` returns `{ valid: true, errors: [] }`

#### Scenario: a typed columns array validates
- GIVEN `config: { columns: [{ "key": "title", "label": "Title" }] }`
- WHEN checked
- THEN every object item passes the `$ref column` branch
- AND `validateManifest()` returns `{ valid: true, errors: [] }`

#### Scenario: a malformed columns entry is flagged
- GIVEN `config: { columns: [{ "key": "title" }] }` (missing `label`)
- WHEN checked against the schema with a $ref-resolving validator
- THEN the missing `label` field MUST be reported on the path
  `pages[N].config.columns[0]`

### Requirement: The schema MUST $ref `action` from index config actions

`pages[].config.properties.actions.items` for `type:"index"` MUST be
`{$ref: "#/$defs/action"}`. The outer `config` keeps
`additionalProperties: true`.

#### Scenario: a typed action array validates
- GIVEN `config: { actions: [{ "id": "edit", "label": "Edit" }] }`
- WHEN checked
- THEN it MUST pass

#### Scenario: an action missing label is flagged
- GIVEN `config: { actions: [{ "id": "edit" }] }`
- WHEN checked
- THEN the missing `label` field MUST be reported

### Requirement: The schema MUST $ref `widgetDef` from dashboard config widgets

`pages[].config.properties.widgets.items` for `type:"dashboard"` MUST
be `{$ref: "#/$defs/widgetDef"}`. The `widgetDef.props` field MUST
keep `additionalProperties: true` so per-widget shapes stay open.

#### Scenario: a typed widgets array validates
- GIVEN `config: { widgets: [{ "id": "kpis", "title": "KPIs", "type": "custom" }] }`
- WHEN checked
- THEN it MUST pass

#### Scenario: a widget missing required `type` is flagged
- GIVEN `config: { widgets: [{ "id": "kpis", "title": "KPIs" }] }`
- WHEN checked against the schema
- THEN the missing `type` field MUST be reported
- AND `validateManifest()` MUST also surface the missing `type`
  with a JSON-pointer-shaped error path
  `/pages/N/config/widgets/0/type`

### Requirement: The schema MUST $ref `layoutItem` from dashboard config layout

`pages[].config.properties.layout.items` for `type:"dashboard"` MUST
be `{$ref: "#/$defs/layoutItem"}`.

#### Scenario: a typed layout array validates
- GIVEN `config: { layout: [{ "id": "p1", "widgetId": "kpis", "gridX": 0, "gridY": 0, "gridWidth": 4, "gridHeight": 3 }] }`
- WHEN checked
- THEN it MUST pass

#### Scenario: a layoutItem with `gridWidth: 0` is flagged
- GIVEN `config: { layout: [{ "id": "p1", "widgetId": "kpis", "gridX": 0, "gridY": 0, "gridWidth": 0, "gridHeight": 3 }] }`
- WHEN checked
- THEN the `gridWidth: must be >= 1` rule MUST flag

### Requirement: The schema MUST $ref `formField` from settings sections.fields

`pages[].config.properties.sections.items.properties.fields.items` for
`type:"settings"` MUST be `{$ref: "#/$defs/formField"}`. The outer
section object keeps `additionalProperties: true` (the body kind
mutual exclusion stays FE-validated).

#### Scenario: a typed fields array validates
- GIVEN `sections: [{ title: 't', fields: [{ key: 'k', label: 'L', type: 'boolean' }] }]`
- WHEN checked
- THEN it MUST pass

#### Scenario: a field with type `'datetime'` is flagged
- GIVEN `sections: [{ title: 't', fields: [{ key: 'k', label: 'L', type: 'datetime' }] }]`
- WHEN checked
- THEN the field's `type` MUST be flagged as not in the closed enum

### Requirement: The schema MUST $ref `sidebarSection` from index sidebar columnGroups

`pages[].config.properties.sidebar.properties.columnGroups.items` for
`type:"index"` MUST be `{$ref: "#/$defs/sidebarSection"}`. The outer
`sidebar` object keeps `additionalProperties: true`.

#### Scenario: a typed columnGroups array validates
- GIVEN `config: { sidebar: { columnGroups: [{ id: 'meta', label: 'Metadata' }] } }`
- WHEN checked
- THEN it MUST pass

#### Scenario: a columnGroup missing `id` is flagged
- GIVEN `config: { sidebar: { columnGroups: [{ label: 'Metadata' }] } }`
- WHEN checked
- THEN the missing `id` field MUST be reported

### Requirement: The schema MUST $ref `sidebarTab` from detail sidebar.tabs and sidebarProps.tabs

`pages[].config.properties.sidebar` for `type:"detail"` MUST be a
`oneOf: [{type:"boolean"}, {type:"object", additionalProperties:true,
properties: { tabs: { type:"array", items: {$ref:
"#/$defs/sidebarTab" } } } }]`. The Object branch keeps
`additionalProperties: true` so `register / schema / title /
subtitle / hiddenTabs / show / enabled` stay free-form.

`pages[].config.properties.sidebarProps.properties.tabs.items` MUST
also be `{$ref: "#/$defs/sidebarTab"}`.

#### Scenario: legacy Boolean sidebar form passes
- GIVEN a detail page with `config: { sidebar: true }`
- WHEN checked
- THEN it MUST pass via the boolean branch

#### Scenario: typed Object sidebar with tabs[] passes
- GIVEN `config: { sidebar: { register: 'r', tabs: [{ id: 't', label: 'T' }] } }`
- WHEN checked
- THEN it MUST pass; `register` is admitted by
  `additionalProperties: true`; `tabs[]` matches the $ref

#### Scenario: a tab missing `id` is flagged
- GIVEN `config: { sidebar: { tabs: [{ label: 'T' }] } }` OR
  `config: { sidebarProps: { tabs: [{ label: 'T' }] } }`
- WHEN checked
- THEN the missing `id` field MUST be reported

### Requirement: The schema's top-level `version` MUST bump to 1.2.0

The `version` field at the top of
`src/schemas/app-manifest.schema.json` MUST be `"1.2.0"`. This is a
tightening change — non-breaking on the documented manifests in
`tests/fixtures/`, but a meaningful surface change worth a minor
version bump.

#### Scenario: schema version is 1.2.0
- GIVEN `import schema from 'src/schemas/app-manifest.schema.json'`
- WHEN `schema.version` is read
- THEN it MUST equal `'1.2.0'`

### Requirement: pages[].config outer object MUST stay open

Despite the inner `$ref`s, the outer
`pages[].config.additionalProperties` MUST remain `true`. Consumer
apps add per-app keys (`register`, `schema`, `source`, `folder`,
`saveEndpoint`, `conversationSource`, `postUrl`, `allowedTypes`, …)
plus extension keys; closing the outer level is out of scope for
this change.

#### Scenario: outer config remains open
- GIVEN `schema.$defs.page.properties.config.additionalProperties`
- WHEN read after this change
- THEN it MUST equal `true`

#### Scenario: existing fixtures still validate
- GIVEN every fixture in `tests/fixtures/`
- WHEN passed through `validateManifest()`
- THEN every fixture that was valid before MUST stay valid; every
  fixture that was invalid MUST stay invalid for the same reason

### Requirement: FE validator MUST surface dashboard widget shape errors

`src/utils/validateManifest.js` MUST extend `validateTypeConfig` so
that `type:"dashboard"` pages validate each `config.widgets[]` entry
has `id`, `title`, and `type` as non-empty strings. Errors include
the JSON-pointer path (`/pages/N/config/widgets/W/<field>`).

The FE validator MUST also validate `config.layout[]` entries when
present: each entry has `id` (string), `widgetId` (string), and
`gridX|gridY|gridWidth|gridHeight` (integer ≥ 0 / ≥ 1 per the
`layoutItem` $def).

#### Scenario: dashboard widget missing type is flagged
- GIVEN a dashboard page with `config: { widgets: [{ id: 'k', title: 'K' }] }`
- WHEN passed to `validateManifest()`
- THEN the result is `valid: false`
- AND `errors` includes a string matching
  `/pages/0/config/widgets/0/type`

#### Scenario: dashboard layoutItem with gridWidth 0 is flagged
- GIVEN `config: { widgets: [{ id: 'k', title: 'K', type: 'custom' }],
  layout: [{ id: 'p', widgetId: 'k', gridX: 0, gridY: 0, gridWidth: 0, gridHeight: 1 }] }`
- WHEN passed to `validateManifest()`
- THEN `errors` MUST flag `/pages/0/config/layout/0/gridWidth`

### Requirement: FE validator MUST surface index actions shape errors

When `type:"index"`, the FE validator MUST validate each
`config.actions[]` entry has `id` and `label` as non-empty strings.

#### Scenario: an action missing label is flagged at runtime
- GIVEN `config: { actions: [{ id: 'edit' }] }`
- WHEN passed to `validateManifest()`
- THEN `errors` MUST include
  `/pages/0/config/actions/0/label`

### Requirement: FE validator MUST surface settings field shape errors

When a settings section uses `fields[]` body kind, the FE validator
MUST validate each field has `key`, `label`, `type`. The `type` MUST
be one of `boolean | number | string | enum | password | json`.

#### Scenario: a settings field with type 'datetime' is flagged
- GIVEN `sections: [{ title: 't', fields: [{ key: 'k', label: 'L', type: 'datetime' }] }]`
- WHEN passed to `validateManifest()`
- THEN `errors` MUST flag
  `/pages/0/config/sections/0/fields/0/type`

### Requirement: FE validator MUST keep cross-array uniqueness rules unchanged

The FE validator MUST NOT remove or change the existing uniqueness
and mutual-exclusion rules — these are not expressible cleanly in
JSON Schema:

- `pages[].id` uniqueness across the array.
- `config.sidebar.tabs[].id` uniqueness within tabs[].
- `config.sidebarProps.tabs[].id` uniqueness within tabs[].
- Tab `widgets` OR `component` mutual exclusion.
- Settings section `fields | component | widgets` exactly-one rule.
- Settings widgets[] entry `type` non-empty.

#### Scenario: tab id uniqueness is still enforced
- GIVEN tabs with two `{ id: 'same' }` entries
- WHEN passed to `validateManifest()`
- THEN the duplicate `id` MUST be flagged on the second entry

### Requirement: Documentation MUST reflect the new $ref wiring

`docs/utilities/manifest-defs.md` MUST be updated to remove the
"additive documentation today" framing and add a section listing
the `$ref` wiring per page-type. `docs/migrating-to-manifest.md`
MUST be updated so the "Schema-validated config shapes" section
explains the live `$ref`s instead of the deferred-follow-up
framing.

#### Scenario: docs are updated
- GIVEN the change is committed
- WHEN `docs/utilities/manifest-defs.md` is read
- THEN it MUST contain the heading "References from
  `pages[].config`"
- AND `docs/migrating-to-manifest.md` MUST contain the phrase
  "schema-level enforcement" without the deferred-follow-up
  language

#### Scenario: check:docs passes
- GIVEN the documentation updates
- WHEN `npm run check:docs` runs
- THEN it MUST exit zero
