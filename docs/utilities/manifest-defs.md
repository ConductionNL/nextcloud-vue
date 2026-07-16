# manifest $defs

Reusable JSON-Schema definitions exposed by `src/schemas/app-manifest.schema.json` for the recurring `pages[].config` sub-shapes. The `$defs` are reachable by JSON-Pointer (`#/$defs/<name>`).

As of schema **version 1.2.0** (the `manifest-config-refs` change), the seven `$defs` are referenced from the `pages[].config` sub-properties they describe. Editor autocomplete, build-time Ajv validation, and CI lint all flag shape violations against the typed `$defs`. The OUTER `pages[].config` block keeps `additionalProperties: true` so per-type scalars (`register`, `schema`, `source`, `folder`, `saveEndpoint`, …) and consumer-app extension keys remain free-form.

## References from `pages[].config`

The schema wires `$ref`s as follows:

| Path | Refs |
|---|---|
| `index.config.columns[]` | `oneOf: [string, $ref column]` (string = legacy shorthand) |
| `index.config.actions[]` | `$ref action` |
| `index.config.sidebar.columnGroups[]` | `$ref sidebarSection` |
| `detail.config.sidebar` | `oneOf: [boolean, object{tabs[] $ref sidebarTab, …additional}]` |
| `detail.config.sidebarProps.tabs[]` | `$ref sidebarTab` |
| `dashboard.config.widgets[]` | `$ref widgetDef` |
| `dashboard.config.layout[]` | `$ref layoutItem` |
| `settings.config.sections[].fields[]` | `$ref formField` |
| `logs.config.columns[]` | `oneOf: [string, $ref column]` (same shorthand as index) |

The detail `config.sidebar` Object branch keeps `additionalProperties: true` so flat scalars (`register`, `schema`, `title`, `subtitle`, `hiddenTabs`, `show`, `enabled`) stay open for the FE validator to type-check. Settings widgets (`sections[].widgets[]`) use a thinner shape `{ type, props? }` and are NOT typed by the `widgetDef` ref — that's a deliberate boundary.

## Example error messages

The FE validator (`validateManifest`) mirrors the schema's strictness for the recurring sub-shapes and produces JSON-pointer-shaped messages.

Dashboard widget missing `type`:

```
/pages/0/config/widgets/0/type: must be a non-empty string
```

Index action missing `label`:

```
/pages/0/config/actions/0/label: must be a non-empty string
```

Settings field with closed-enum violation:

```
/pages/0/config/sections/0/fields/0/type: must be one of boolean, number, string, enum, password, json
```

LayoutItem with `gridWidth: 0`:

```
/pages/0/config/layout/0/gridWidth: must be >= 1
```

## column

Table column definition consumed by `CnDataTable` / `CnIndexPage`.

```json
{
	"key": "title",
	"label": "myapp.column.title",
	"sortable": true,
	"width": "200px",
	"align": "left",
	"hidden": false
}
```

- `key` (required, string)
- `label` (required, string — i18n key)
- `sortable?` (boolean, default true)
- `width?` (CSS width string)
- `align?` (`left | center | right`)
- `formatter?` (string — formatter registry id)
- `widget?` (string — cell widget registry id)
- `hidden?` (boolean, default false)

## action

Row / bulk action definition consumed by `CnRowActions` / `CnActionsBar`. Function-typed runtime fields (`handler`, `disabled`, `visible`) are not representable in JSON; the manifest substitutes an `id` the consumer dispatches on.

```json
{
	"id": "edit",
	"label": "myapp.action.edit",
	"icon": "Pencil",
	"primary": true,
	"confirm": false
}
```

- `id` (required, string)
- `label` (required, string — i18n key)
- `icon?` (string — MDI name OR registry id)
- `permission?` (string — permission gate)
- `primary?` (boolean, default false)
- `confirm?` (boolean, default false)

## widgetDef

Dashboard widget definition consumed by `CnDashboardPage`. Mirrors the manifest-friendly subset of `useDashboardView`'s widget shape.

```json
{
	"id": "kpis",
	"title": "myapp.dashboard.kpis",
	"type": "custom",
	"iconClass": "icon-graph",
	"itemApiVersions": [1, 2]
}
```

- `id` (required, string)
- `title` (required, string — i18n key)
- `type` (required, string — `custom | tile | <nc-widget-id>`)
- `iconUrl?` (string)
- `iconClass?` (string)
- `itemApiVersions?` (array of integers — NC Dashboard API)
- `props?` (object — passthrough)

## layoutItem

Dashboard grid layout entry consumed by `CnDashboardGrid` / `CnDashboardPage`. Pairs a widget (by id) with a position and size.

```json
{
	"id": "kpis-position",
	"widgetId": "kpis",
	"gridX": 0,
	"gridY": 0,
	"gridWidth": 4,
	"gridHeight": 3,
	"showTitle": true
}
```

- `id` (required, string — distinct from `widgetId`)
- `widgetId` (required, string — refs `widgetDef.id`)
- `gridX` (required, integer >= 0)
- `gridY` (required, integer >= 0)
- `gridWidth` (required, integer >= 1)
- `gridHeight` (required, integer >= 1)
- `showTitle?` (boolean, default true)

## formField

Schema-driven form field consumed by manifest-driven settings / form pages. Manifest-relevant subset of `fieldsFromSchema()`'s output.

```json
{
	"key": "feature_x_enabled",
	"label": "myapp.settings.feature_x",
	"type": "boolean",
	"default": false,
	"help": "myapp.settings.feature_x.help"
}
```

- `key` (required, string — IAppConfig or schema property name)
- `label` (required, string — i18n key)
- `type` (required, enum: `boolean | number | string | enum | password | json`)
- `required?` (boolean, default false)
- `default?` (any — matches `type`)
- `enum?` (array — when `type === "enum"`)
- `widget?` (string — widget registry hint)
- `help?` (string — i18n key)

## sidebarSection

Manifest-side equivalent of `CnIndexSidebar.columnGroups[]`. Declares a collapsible group of column visibility toggles.

```json
{
	"id": "metadata",
	"label": "myapp.sidebar.metadata",
	"icon": "Information",
	"fields": [
		{ "key": "owner", "label": "myapp.metadata.owner" },
		{ "key": "created", "label": "myapp.metadata.created" }
	]
}
```

- `id` (required, string)
- `label` (required, string — i18n key)
- `icon?` (string — MDI name)
- `fields?` (array of `{ key, label }`)

## sidebarTab

Detail-sidebar tab consumed by `CnObjectSidebar` after the parallel `manifest-abstract-sidebar` change opens the registry. A tab declares either a `widgets` list OR a `component` registry name; the mutual exclusion is enforced by `validateManifest`'s sidebar rules at runtime (not by `oneOf` in the schema).

```json
{
	"id": "details",
	"label": "myapp.sidebar.details",
	"icon": "Information",
	"widgets": [
		{ "type": "data" },
		{ "type": "metadata" }
	]
}
```

- `id` (required, string)
- `label` (required, string — i18n key)
- `icon?` (string — MDI name)
- `widgets?` (array of objects — `{ type: 'data' | 'metadata' | <registry> }`)
- `component?` (string — registry component name; mutually exclusive with `widgets`)

## Custom-fallback summary

Several real-world fields fell back to `additionalProperties: true` or to free-form strings because a closed shape would over-constrain consumers:

- `pages[].config` OUTER block — `additionalProperties: true`. Per-type scalars (`register`, `schema`, `source`, `folder`, `saveEndpoint`, `conversationSource`, `postUrl`, `allowedTypes`) plus consumer-app extension keys land here.
- `detail.config.sidebar` Object branch outer — `additionalProperties: true`. `register / schema / title / subtitle / hiddenTabs / show / enabled` stay free-form; only `tabs[]` is typed.
- `index.config.sidebar` outer — `additionalProperties: true`. Flat scalars (`enabled / show / facets / search / showMetadata`) stay free-form; only `columnGroups[]` is typed.
- `settings.config.sections[]` outer — `additionalProperties: true`. The body kind exactly-one rule is FE-validated; only `fields[]` is typed.
- `settings.config.sections[].widgets[]` — thinner shape `{ type, props? }` than the `widgetDef` ref; NOT typed by this schema. Future `settingsWidget` `$def` could tighten.
- `column.formatter`, `column.widget` — open registry strings.
- `action.icon` — open string (MDI name OR registry id).
- `widgetDef.type` — open string (custom/tile + any NC widget id).
- `widgetDef.props` — open `{}` per widget type.
- `layoutItem.styleConfig` — deliberately omitted.
- `formField.validation`, `formField.items` — deferred to a richer `validation` `$def`.
- `sidebarTab.widgets[]` — left as `array<object>`; a future `sidebarWidget` `$def` would tighten this.
- `index.config.columns[]` / `logs.config.columns[]` — accepts a string-shorthand legacy form alongside the typed `column` $ref via `oneOf`.
- Recursive shapes (nested tabs, nested widgets) — defer until a third consumer surfaces a need.
- `action.handler / disabled / visible` predicates — function-typed; not representable in JSON.

Cross-array uniqueness and mutual-exclusion rules stay enforced by the FE validator (`validateManifest`) — JSON Schema can express some of these but the readability cost outweighs the benefit:

- `pages[].id` uniqueness across the array.
- `config.sidebar.tabs[].id` and `config.sidebarProps.tabs[].id` uniqueness within tabs[].
- Tab `widgets` OR `component` mutual exclusion.
- Settings section `fields | component | widgets` exactly-one rule.
