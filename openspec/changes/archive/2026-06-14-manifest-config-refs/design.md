# Design: Manifest config $refs

## Reuse analysis

- All seven `$defs` already exist in
  `src/schemas/app-manifest.schema.json` (added by
  `manifest-config-defs`). No new `$defs` are introduced here — only
  `$ref` wiring from `config` sub-properties to existing defs.
- The `manifest-detail-sidebar-config` change already established a
  `oneOf: [boolean, object]` pattern for `detail.config.sidebar`; we
  reuse that pattern for `index.config.columns[]` (where the legacy
  shorthand is a string).
- The FE validator (`src/utils/validateManifest.js`) already enforces
  most runtime rules (tab id uniqueness, widgets-OR-component mutual
  exclusion, settings section body kind). Schema $refs duplicate the
  cheap rules (required fields, types) without trying to replicate
  the cross-array uniqueness or mutual-exclusion rules — JSON Schema
  Draft 2020-12 can express both via `uniqueItems` (on simple arrays)
  and `oneOf` (on objects) but the readability cost outweighs the
  benefit; the FE validator already produces sharper messages.

## Mapping table

For each page-type `config` property, the table lists what `$def` it
now refs (or, if intentionally NOT ref'd, why).

| Page type | `config` path | New schema | Why |
|---|---|---|---|
| `index` | `config.columns[]` | `oneOf: [{type:string}, {$ref: column}]` | Legacy shorthand: many fixtures pass `columns: ["title","status","deadline"]`. A `oneOf` admits both the shorthand string and the typed `{key,label,...}` object. |
| `index` | `config.actions[]` | `{$ref: action}` | No legacy shorthand; the only existing usage is the typed object form. |
| `index` | `config.sidebar` | (object, `additionalProperties: true`) | Outer object stays open; consumers add per-app keys (`enabled`, `show`, `facets`, `search`, …). Only the inner array typed below. |
| `index` | `config.sidebar.columnGroups[]` | `{$ref: sidebarSection}` | Direct match to the def shape. |
| `detail` | `config.sidebar` | `oneOf: [{type:boolean}, {type:object, additionalProperties:true, properties: {…tabs[] $ref sidebarTab}}]` | Legacy Boolean form preserved (set by `manifest-detail-sidebar-config`); Object form keeps `additionalProperties:true` for `register/schema/title/subtitle/hiddenTabs/show/enabled` (those are flat scalars validated by the FE) but `tabs[]` becomes typed. |
| `detail` | `config.sidebarProps.tabs[]` | `{$ref: sidebarTab}` | Legacy alternate path to tabs; same shape, same ref. |
| `dashboard` | `config.widgets[]` | `{$ref: widgetDef}` | Direct match. |
| `dashboard` | `config.layout[]` | `{$ref: layoutItem}` | Direct match. |
| `settings` | `config.sections[]` | (object, `additionalProperties: true`, with `fields[]` typed below) | Outer section stays open: `manifest-settings-rich-sections` set the body to be EXACTLY ONE of `fields | component | widgets`. The mutual exclusion is enforced by the FE validator; encoding it as JSON-Schema `oneOf` here would force every section to declare ALL three properties as either present or absent — readable in JS, ugly in schema. Keep open; only `fields[]` becomes typed. |
| `settings` | `config.sections[].fields[]` | `{$ref: formField}` | Direct match. |
| `settings` | `config.sections[].widgets[]` | (left as `array<object>` with `additionalProperties: true`) | Settings widgets are NOT the same shape as dashboard widgetDef — `{ type, props? }` vs `{ id, title, type, … }`. The settings-rich-sections spec deliberately uses a thinner shape; widening `widgetDef` to cover both would weaken the dashboard contract. Defer to a follow-up if a third widget shape surfaces. |
| `logs` | `config.columns[]` | `oneOf: [{type:string}, {$ref: column}]` | Same shorthand support as index. |
| `chat`, `files`, `custom` | (none) | unchanged | No recurring sub-shape; nothing to ref. |

## Strictness boundary — what stays open and why

The `pages[].config` *outer* block keeps `additionalProperties: true`
on every page type. Each page type's `config` is the catch-all bag for
type-specific fields (`register`, `schema`, `source`, `folder`,
`saveEndpoint`, `conversationSource`, `postUrl`, `allowedTypes`, etc.)
plus consumer-app extension keys. Closing the outer level would require
either:

1. Enumerating every per-type field across the schema (high churn on
   future page-type changes), or
2. A `oneOf` over per-type shapes (ugly in JSON Schema, brittle when
   types are added).

Both lose for a non-load-bearing tightening. **The `$refs` only land
on the recurring sub-shapes** — array items with a clearly defined,
component-driven contract.

Specific properties that intentionally STAY open:

- **`index.config.sidebar`** — the outer object. `enabled / show /
  facets / search / showMetadata / columnGroups` are all flat
  primitives or open objects; the FE validates them by type. Closing
  the sidebar would force a shape change every time `CnIndexSidebar`
  gains a prop.
- **`detail.config.sidebar.<scalar fields>`** — `register`, `schema`,
  `title`, `subtitle`, `hiddenTabs[]`, `show`, `enabled`. FE-validated
  flat scalars. Outer `additionalProperties: true` lets future fields
  land without a schema bump.
- **`settings.config.sections[]`** outer section object — body kind
  is exactly one of `fields | component | widgets` (FE-enforced
  mutual exclusion, the schema doesn't try). The outer section keeps
  `additionalProperties: true` so a consumer can add `helpText` /
  `permission` / future side fields.
- **`settings.config.sections[].widgets[]`** — see mapping table.
  Different shape from `widgetDef`; warrants a separate `$def` that
  hasn't been authored yet.
- **`widgetDef.props`** — every widget type has its own props shape.
  Closing this would explode into per-widget-type sub-defs. Stays
  `additionalProperties: true`.
- **`column.formatter`, `column.widget`** — open strings (consumer-
  registry resolved). No closed enum possible.
- **`action.icon`** — open string (MDI name OR registry id).
- **`widgetDef.type`** — open string (custom / tile / any NC widget id).
- **`pages[].slots`** — `additionalProperties: { type: "string" }`
  ALREADY enforces every value is a string; the keys are open by
  design (consumer-defined slot names).

## Backwards-compat assertion

Every existing fixture in `tests/fixtures/` continues to validate
clean after this change. Specifically:

- **`manifest-valid.json`** — uses `columns: ["title", "status",
  "deadline"]` (string shorthand). The `oneOf` on
  `columns[]` admits this.
- **`manifest-all-types.json`** — same shorthand for `columns[]`,
  uses `widgets: [{id, title, type}]` for dashboard (matches
  `widgetDef`), uses `fields: [{key, type, label}]` for settings
  (matches `formField`).
- **`manifest-settings-rich.json`** — uses bare-fields, component-
  only, widgets-only, and compound section bodies. The fields[]
  arrays match `formField`. The section.widgets[] arrays use the
  thinner `{ type, props? }` shape and are NOT typed by this change
  (left open, see mapping table).
- **`manifest-sidebar-show.json`** — uses detail.config.sidebar
  Object form with `tabs[]: [{ id, label, widgets }]`. Matches
  `sidebarTab`. The tabs widgets here are `{ type: "data" }` /
  `{ type: "metadata" }`; the `sidebarTab.widgets[]` in the def
  already uses `additionalProperties: true` so any shape passes.
- **`manifest-invalid-type-config.json`** — fails on different rules
  (logs missing register+schema OR source, settings empty sections,
  chat missing both URL fields, files missing folder). None of those
  paths touch the new `$ref`s. Continues failing the same way.
- **`manifest-invalid.json`** — fails on top-level rules (semver,
  duplicate id, missing label, missing component on custom). None of
  those paths touch the new `$ref`s. Continues failing the same way.
- **`def-*-valid.json` / `def-*-invalid.json`** — used by the
  `app-manifest-defs` spec; not run through `validateManifest`.
  Continue working as-is.

## $ref wiring in JSON Schema Draft 2020-12

Pattern for replacing `additionalProperties: true` with a typed array:

```jsonc
// Before:
"columns": { "type": "array" }   // (often implicit / not declared)

// After:
"columns": {
  "type": "array",
  "items": {
    "oneOf": [
      { "type": "string" },                  // legacy shorthand
      { "$ref": "#/$defs/column" }           // typed form
    ]
  }
}
```

The `oneOf` matches at most one branch — JSON's structural distinction
(string vs object) makes the discrimination unambiguous.

For non-shorthand cases (no legacy bare-string usage in fixtures), drop
the `oneOf` and ref directly:

```jsonc
"actions": {
  "type": "array",
  "items": { "$ref": "#/$defs/action" }
}
```

For the detail sidebar Boolean-OR-Object outer shape (set by
`manifest-detail-sidebar-config`), the existing description already
documents the `oneOf` semantics; this change formalises it:

```jsonc
"sidebar": {
  "oneOf": [
    { "type": "boolean" },
    {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "tabs": { "type": "array", "items": { "$ref": "#/$defs/sidebarTab" } }
      }
    }
  ]
}
```

The Object branch keeps `additionalProperties: true` (so `register`,
`schema`, `title`, `subtitle`, `hiddenTabs`, `show`, `enabled` remain
free-form) but enforces the array-item type for `tabs[]`.

## Validator alignment

Where the schema is now stricter than the FE validator, the FE
validator stays slightly behind on type checks: the FE's job is to
produce ACTIONABLE messages, and `additionalProperties: false`
violations from JSON Schema are noisy ("unknown property `field`" with
no hint about the intended `key`). The FE keeps narrow type-and-
required-field checks and lets the BE / hydra Ajv runs surface the
shape-level violations.

Where the FE validator is stricter than the schema (or expresses rules
the schema can't), it stays as-is:

- Tab id uniqueness (`config.sidebarProps.tabs[].id`,
  `config.sidebar.tabs[].id`).
- Tab widgets-OR-component mutual exclusion.
- Settings section `fields | component | widgets` exactly-one rule.
- Settings widgets[] `type` non-empty string.

## Schema version bump

This change bumps `version` from `1.1.0` to `1.2.0`. Three reasons:

1. The change is meaningfully different at the surface — editors and
   CI Ajv tools will start flagging shape violations they previously
   ignored. That's worth a minor bump.
2. Documented manifests don't break (the back-compat assertion above
   covers the existing fixtures), so it's not a major bump.
3. The `1.1.x` patches (sidebar config, settings rich sections) were
   patch-level metadata changes. This is the first surface tightening
   since 1.1.0.

The bump propagates to:

- `tests/schemas/app-manifest.schema.spec.js` — three assertions
  pinning `schema.version === '1.1.0'` flip to `'1.2.0'`.
- Documentation (`docs/utilities/manifest-defs.md`,
  `docs/migrating-to-manifest.md`).

## Custom fallbacks (final list)

Honest list of every spot where a closed shape couldn't be enforced.
Same list shape as in the prior `manifest-config-defs/design.md`,
extended with the new findings:

1. **`index.config.columns[]` legacy string shorthand** — fixtures
   pass `columns: ["title","status","deadline"]`. The `oneOf`
   accepts the shorthand to keep back-compat. A future tightening
   could deprecate the shorthand by lint warning, then by removal.
2. **`logs.config.columns[]` same shorthand** — accepted via the
   same `oneOf`.
3. **`pages[].config` outer block** — `additionalProperties: true`
   stays on every page type. Required for per-app extension keys
   and per-page-type scalar fields (`register`, `schema`, `source`,
   `folder`, `saveEndpoint`, `conversationSource`, `postUrl`,
   `allowedTypes`).
4. **`index.config.sidebar` outer object** — stays open; flat scalars
   are FE-validated.
5. **`detail.config.sidebar` Object branch outer** — stays open;
   only `tabs[]` becomes typed. `register / schema / title /
   subtitle / hiddenTabs / show / enabled` remain `additionalProperties:
   true` items the FE validates.
6. **`settings.config.sections[]` outer section** — stays open;
   exactly-one body kind enforced by the FE.
7. **`settings.config.sections[].widgets[]`** — different shape from
   `widgetDef`. Stays `array<object>` with
   `additionalProperties: true`. Future `settingsWidget` `$def`
   could tighten this.
8. **`widgetDef.props`** — open `{}` per widget type. Schema cannot
   enumerate per-widget shapes.
9. **`sidebarTab.widgets[]`** — same as in
   `manifest-config-defs/design.md`. Sidebar widgets are NOT the same
   shape as dashboard widgetDef. Stays `array<object>`.
10. **`column.formatter / column.widget / action.icon /
    widgetDef.type`** — open strings. Registries vary per app.
11. **`action.handler / disabled / visible`** predicates —
    function-typed; no JSON representation.
12. **Action mutual-exclusion / tab uniqueness / settings-body
    exactly-one** — FE-validated. JSON Schema can express but the
    readability is poor; the FE produces sharper messages.

## Open design questions

1. **Should `oneOf [string, $ref column]` be split into
   `anyOf` instead?** No — `oneOf` is correct here. A column item is
   either a string OR an object; there's no shape that's both.
   `oneOf` enforces exactly-one match, which is what we want.
2. **Should the schema add `uniqueItems: true` on `pages[].config.
   sidebarProps.tabs[]`?** No — `uniqueItems` checks for deep
   equality, not for `id` uniqueness. The FE validator catches the
   `id` collision case the schema can't express cleanly.
3. **Bump version to 1.2.0 vs 2.0.0?** 1.2.0. Documented manifests
   don't break (the existing fixtures all keep validating). Major
   bump is reserved for actual breakage (e.g. a removed page type or
   a renamed config field).
