## Purpose

Defines the JSON Schema shape for a `nav-card-grid` widget's card entries —
arbitrary navigation links declared in a v2 manifest, rendered as a card grid
instead of a nested menu — so ADR-044 §4 cards-collapse landing pages become
expressible as manifest data.

## ADDED Requirements

### Requirement: navCardEntry schema shape

`src/schemas/app-manifest-v2.schema.json` SHALL define a `navCardEntry` `$def`
with `required: ["id", "label"]`, `additionalProperties: false`, and
properties `id` (string), `label` (string), `description` (string, optional),
`icon` (string, optional), `route` (string, optional), `href` (string,
optional), `count` (integer >= 0 or the literal string `"auto"`, optional),
`order` (integer, optional), `permission` (string, optional), and `visibleIf`
(`$ref` to the existing `visibleIfCondition` `$def`, optional).

#### Scenario: Minimal valid entry
- **WHEN** a `navCardEntry` declares only `id` and `label`
- **THEN** it validates against the schema

#### Scenario: Full entry validates
- **WHEN** a `navCardEntry` declares `id`, `label`, `description`, `icon`,
  `route`, `count: "auto"`, `order`, `permission`, and `visibleIf`
- **THEN** it validates against the schema

#### Scenario: Unknown property rejected
- **WHEN** a `navCardEntry` declares a property not in the shape (e.g.
  `badge`)
- **THEN** schema validation fails (`additionalProperties: false`)

### Requirement: route and href are mutually exclusive

A `navCardEntry` SHALL NOT declare both `route` and `href` — a card links
either to an in-app manifest page (`route`) or to an external URL (`href`),
never both.

#### Scenario: route only
- **WHEN** a `navCardEntry` declares `route` and omits `href`
- **THEN** it validates against the schema

#### Scenario: href only
- **WHEN** a `navCardEntry` declares `href` and omits `route`
- **THEN** it validates against the schema

#### Scenario: neither route nor href
- **WHEN** a `navCardEntry` declares neither `route` nor `href`
- **THEN** it validates against the schema (a card with no navigation target
  is schema-valid; the rendering component is responsible for its
  disabled/informational presentation)

#### Scenario: both route and href rejected
- **WHEN** a `navCardEntry` declares both `route` and `href`
- **THEN** schema validation fails

### Requirement: count accepts an integer or the "auto" sentinel

The `navCardEntry.count` property SHALL accept either a non-negative integer
or the literal string `"auto"`, mirroring the existing `menuItem.count` shape.

#### Scenario: Integer count
- **WHEN** a `navCardEntry` declares `count: 12`
- **THEN** it validates against the schema

#### Scenario: Auto count
- **WHEN** a `navCardEntry` declares `count: "auto"`
- **THEN** it validates against the schema

#### Scenario: Invalid count value rejected
- **WHEN** a `navCardEntry` declares `count: "sometimes"`
- **THEN** schema validation fails

### Requirement: nav-card-grid widgetEntry requires typed entries

`widgetEntry.allOf` SHALL gain an `if`/`then` branch (matching the existing
`widgetKey: "object-table"` pattern) so that when `widgetKey` equals
`"nav-card-grid"`, `props.entries` is required and MUST be an array of
`navCardEntry` items.

#### Scenario: Valid nav-card-grid widget entry
- **WHEN** a `widgetEntry` declares `widgetKey: "nav-card-grid"` and
  `props.entries` is an array of valid `navCardEntry` objects
- **THEN** it validates against the schema

#### Scenario: Missing entries rejected
- **WHEN** a `widgetEntry` declares `widgetKey: "nav-card-grid"` without
  `props.entries`
- **THEN** schema validation fails

#### Scenario: Malformed entry rejected
- **WHEN** a `widgetEntry` declares `widgetKey: "nav-card-grid"` and
  `props.entries` contains an object missing the required `label`
- **THEN** schema validation fails

### Requirement: Manifest schema version bump

`src/schemas/app-manifest-v2.schema.json`'s top-level `version` field SHALL
be bumped from `2.22.0` to `2.23.0` to reflect the additive `navCardEntry`
`$def` and the `nav-card-grid` widget-entry constraint.

#### Scenario: Version reflects the addition
- **WHEN** the schema file is loaded
- **THEN** its `version` field reads `2.23.0`
