# Design: Manifest config $defs

## Reuse analysis

- The existing `$defs` (`menuItem`, `menuItemLeaf`, `page`) set the
  precedent: `type: "object"`, `additionalProperties: false`,
  per-property `description`, top-level `description`. The seven new
  `$defs` follow exactly that pattern.
- Source of truth for each shape:
  - `column` — `src/utils/schema.js` `columnsFromSchema()` returns
    `{ key, label, sortable, type, format, width, enum?, items? }`;
    `CnDataTable` documents `{ key, label, sortable, width, class,
    cellClass }` as the manual-mode column shape. The `$def` takes
    the union of useful manifest fields (key, label, sortable, width,
    align, formatter, widget, hidden).
  - `action` — `CnRowActions` documents `{ label, icon, handler,
    disabled, visible, title, destructive }`. In manifest land,
    `handler` is a function which can't survive JSON; we substitute
    `id` (the action key the consumer's component dispatches on).
    The `$def`: `{ id, label, icon, permission, primary, confirm }`.
  - `widgetDef` — `CnDashboardPage` documents `{ id, title, type,
    iconUrl, iconClass, buttons, itemApiVersions, reloadInterval }`;
    the manifest-friendly subset is `{ id, title, type, iconUrl,
    iconClass, itemApiVersions, props }`.
  - `layoutItem` — `CnDashboardGrid` and `CnDashboardPage` both use
    `{ id, widgetId, gridX, gridY, gridWidth, gridHeight, showTitle,
    styleConfig }`. The `$def` keeps the geometry + `showTitle`.
  - `formField` — `src/utils/schema.js` `fieldsFromSchema()` returns
    `{ key, label, description, type, format, widget, required,
    readOnly, default, enum, items, validation, order }`. Manifest-
    relevant subset: `{ key, label, type, required, default, enum,
    widget, help }`.
  - `sidebarSection` — `CnIndexSidebar` accepts `columnGroups: [{ id,
    label, columns: [{key, label}], expanded? }]`. The `$def` is the
    manifest-side equivalent: `{ id, label, icon, fields }` where
    `fields` is an array of `{ key, label }` pairs.
  - `sidebarTab` — the parallel `manifest-abstract-sidebar` change
    accepts `{ id, label, icon?, widgets?, component?, order? }` on
    `CnObjectSidebar.tabs`. The `$def` mirrors that shape. (Also the
    user explicitly named `sidebarTab` in the request.)

## Why additive (not yet referenced from config)

Two parallel branches are landing into `origin/beta` at the same time
as this one:

1. `feature/manifest-page-type-extensions` (commit `4b308d9`) — bumps
   `version` to `1.1.0`, rewrites the `pages[].type` description, and
   rewrites the `pages[].config` description with new per-type shape
   docstrings (`logs` / `settings` / `chat` / `files`).
2. `feature/manifest-abstract-sidebar` (commit `05a8ffb`) — bumps
   `version` to `1.0.1`, extends the `pages[].config` description with
   `sidebar` + `sidebarProps.tabs` shape docstrings.

Both touch:

- The `version` line (different bumps).
- The `pages[].config` `description` line (different content).

If we add `$ref`s from `config` to the new `$defs` in this change, we
*also* edit the `pages[].config` block — guaranteeing a three-way merge
conflict the moment any two of these branches land. By scoping this
change to additive `$defs` definitions appended at the END of the
existing `$defs` block, the diff is one clean append + zero edits to
existing schema lines. Merges become trivial regardless of order.

The `$defs` are still useful before the wiring lands:

- Editors that grok JSON Schema (VSCode with the YAML/JSON Schema
  extension) can navigate to a `$def` by JSON-Pointer and use it for
  inline preview docs.
- Ajv consumers can validate fragments directly:
  `ajv.compile({$ref: '#/$defs/column'})`.
- Cross-spec documentation can hyperlink anchors
  (`#/$defs/widgetDef`).

## Follow-up: tighten references

After the two parallel changes merge, a successor change
(`manifest-config-defs-tighten`) will add `$ref`s from `config` blocks
to these `$defs`. Concretely:

| Where | What to `$ref` |
|---|---|
| `pages[].config.columns[]` (type=index, type=detail, type=logs) | `#/$defs/column` |
| `pages[].config.actions[]` (type=index, type=detail) | `#/$defs/action` |
| `pages[].config.widgets[]` (type=dashboard) | `#/$defs/widgetDef` |
| `pages[].config.layout[]` (type=dashboard) | `#/$defs/layoutItem` |
| `pages[].config.sections[].fields[]` (type=settings) | `#/$defs/formField` |
| `pages[].config.sidebar.columnGroups[]` (type=index) | `#/$defs/sidebarSection` |
| `pages[].config.sidebarProps.tabs[]` (type=detail) | `#/$defs/sidebarTab` |

The tightening change will also flip `additionalProperties: true → false`
on each referenced sub-shape inside the `config` block — at which
point misshaped configs surface as Ajv errors at build time instead
of silent runtime drift.

## Backward compatibility

- Adding `$defs` definitions that are not referenced anywhere is a
  pure no-op for every existing manifest. JSON Schema resolves `$defs`
  lazily — they only do anything when a `$ref` resolves to them.
  Existing fixtures (`tests/fixtures/manifest-valid.json`,
  `tests/fixtures/manifest-invalid.json`) MUST continue to validate
  exactly as before.
- The hand-rolled `validateManifest()` is unchanged in this change.
  It already ignores `$defs` (it walks the manifest directly, not the
  schema).

## Field-by-field choices

### `column`

```jsonc
{
  "key": "title",          // required: object property to render
  "label": "Title",        // required: column header (i18n key)
  "sortable": true,        // optional, default true
  "width": "200px",        // optional CSS width
  "align": "left",         // optional: left|center|right
  "formatter": "date",     // optional: cell value formatter id
  "widget": "text",        // optional: cell widget hint
  "hidden": false          // optional: hide by default (toggle in sidebar)
}
```

`align` is closed-enum (`left | center | right`). `formatter` and
`widget` are open strings — registries vary by app.

### `action`

```jsonc
{
  "id": "edit",            // required: dispatched event key
  "label": "Edit",         // required: i18n key
  "icon": "Pencil",        // optional: MDI name OR component id
  "permission": "edit",    // optional: gate by user permission
  "primary": false,        // optional: render outside the menu
  "confirm": true          // optional: show confirm dialog
}
```

`handler` (function) and `disabled` / `visible` (function) from
CnRowActions cannot live in JSON — those bind in the consumer's code,
not the manifest.

### `widgetDef`

```jsonc
{
  "id": "kpis",                // required
  "title": "Key Metrics",      // required (i18n key)
  "type": "custom",            // required: custom | tile | <nc-widget-id>
  "iconUrl": "/img/icon.svg",  // optional
  "iconClass": "icon-graph",   // optional
  "itemApiVersions": [1, 2],   // optional: NC Dashboard API
  "props": {}                  // optional: passthrough props for the widget
}
```

`buttons` (array of NcAction-like objects) and `reloadInterval` from
the live shape are deliberately deferred — they're rarely manifest-
driven (consumers compute them).

### `layoutItem`

```jsonc
{
  "id": "kpis-position",   // required
  "widgetId": "kpis",      // required: refs widgetDef.id
  "gridX": 0,              // required, integer >= 0
  "gridY": 0,              // required, integer >= 0
  "gridWidth": 4,          // required, integer >= 1
  "gridHeight": 3,         // required, integer >= 1
  "showTitle": true        // optional, default true
}
```

`styleConfig` is intentionally omitted — it's a free-form object the
component pipes through; making it a `$def` would over-constrain.

### `formField`

```jsonc
{
  "key": "feature_x",      // required: IAppConfig key (or schema property)
  "label": "Enable X",     // required: i18n key
  "type": "boolean",       // required: boolean | number | string | enum | password | json
  "required": false,       // optional
  "default": false,        // optional
  "enum": ["on", "off"],   // optional: dropdown options
  "widget": "checkbox",    // optional: widget hint
  "help": "Tooltip text"   // optional: help string (i18n key)
}
```

`type` is closed-enum (the six listed values). `validation`
(min/max/pattern) and `items` from `fieldsFromSchema()` are deferred
to the tightening pass — they're useful when `formField` $refs from
schema-driven contexts, not yet from manifest contexts.

### `sidebarSection`

```jsonc
{
  "id": "metadata",        // required
  "label": "Metadata",     // required (i18n key)
  "icon": "Information",   // optional: MDI name
  "fields": [              // optional: list of column refs
    { "key": "owner", "label": "Owner" },
    { "key": "created", "label": "Created" }
  ]
}
```

This is the manifest-side equivalent of `CnIndexSidebar.columnGroups`.
`expanded?` (default state) is deferred — consumers default to
collapsed if the section has > 5 fields, which is a UX rule, not a
manifest one.

### `sidebarTab`

```jsonc
{
  "id": "details",                     // required
  "label": "Details",                  // required (i18n key)
  "icon": "Information",               // optional: MDI name
  "widgets": [                         // optional: list of widget refs
    { "type": "data" },
    { "type": "metadata" }
  ],
  "component": "MyCustomTab"           // optional: registry component name
}
```

`widgets` and `component` are mutually exclusive (a tab declares
content via one or the other) — but JSON Schema's `oneOf` /
`not.required` machinery is intentionally NOT enforced here so the
$def stays flat and easy to reason about. The mutual exclusion is
caught at runtime by `validateManifest`'s sidebar rules added in the
parallel `manifest-abstract-sidebar` change. We can tighten with
`oneOf` in the follow-up.

## Custom fallbacks

Honest list of where the `$def` couldn't fully capture a real-world
shape:

1. **`column.formatter`** — open string. Apps register formatters in
   their own customComponents registry; the schema can't enumerate
   them. Documented as a string with no enum.
2. **`column.widget`** — same: open string for the cell-widget
   registry.
3. **`action.icon`** — open string (an MDI component name OR a
   registry id). Schema cannot disambiguate, so it stays a string.
4. **`widgetDef.type`** — open string. The dashboard supports
   `custom`, `tile`, and any NC Dashboard API widget id (e.g.
   `calendar`, `talk`). Enumerating breaks NC widget interop.
5. **`widgetDef.props`** — open `{}` object. Each widget type has its
   own props shape; capturing them here would explode into per-
   widget-type sub-defs. Defer.
6. **`layoutItem.styleConfig`** — deliberately omitted; see above.
7. **`formField.validation`** — deferred. Belongs in a `validation`
   `$def` of its own; not part of MVP.
8. **`sidebarTab.widgets[]`** — left as `array<object>` not
   `array<#/$defs/widgetDef>`. Sidebar widgets are NOT the same shape
   as dashboard widgets (`type: 'data' | 'metadata' | <registry>`
   inside a sidebar tab vs the full dashboard widgetDef). A separate
   `sidebarWidget` `$def` could capture them; deferred until a third
   consumer surfaces the need.
9. **Recursive shapes** — none of the new `$defs` recurse. If a
   sidebar tab ever contains nested tabs, or a dashboard widget
   contains nested widgets, that's a separate `$def` revision.
10. **Action `disabled` / `visible` predicates** — function-typed in
    the runtime API; no JSON representation. Manifest-driven actions
    can't express conditional disablement; consumers wire that up in
    their action handlers.

## Open design questions

1. **Should `formField.type` allow `'object'` for nested forms?** No
   for v1 — nested forms surface in `CnAdvancedFormDialog` and
   `CnSchemaFormDialog`, which are not manifest-driven. Defer.
2. **Should `column.align` accept `start`/`end` (logical) instead of
   `left`/`right` (visual)?** No for v1; the existing components use
   `left/right`. RTL bidi support is a separate cross-cutting concern.
3. **Should the `$id` of each `$def` be set?** No — JSON Schema
   $defs don't need their own `$id`; consumers reach them via JSON-
   Pointer (`#/$defs/column`). Adding `$id` would conflict with the
   schema-wide `$id` URL.
