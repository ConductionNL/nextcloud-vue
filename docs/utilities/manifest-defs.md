# manifest $defs

Reusable JSON-Schema definitions exposed by `src/schemas/app-manifest.schema.json` for the recurring `pages[].config` sub-shapes. The `$defs` are reachable by JSON-Pointer (`#/$defs/<name>`).

These definitions are **additive documentation** today — the manifest schema ships them, but `pages[].config` keeps `additionalProperties: true`. A follow-up change wires `$ref`s from config sub-properties into the `$defs` after the parallel `manifest-page-type-extensions` and `manifest-abstract-sidebar` schema changes merge. See `openspec/changes/manifest-config-defs/design.md` for the rationale.

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

- `column.formatter`, `column.widget` — open registry strings.
- `action.icon` — open string (MDI name OR registry id).
- `widgetDef.type` — open string (custom/tile + any NC widget id).
- `widgetDef.props` — open `{}` per widget type.
- `layoutItem.styleConfig` — deliberately omitted.
- `formField.validation`, `formField.items` — deferred to a richer `validation` `$def`.
- `sidebarTab.widgets[]` — left as `array<object>`; a future `sidebarWidget` `$def` would tighten this.
- Recursive shapes (nested tabs, nested widgets) — defer until a third consumer surfaces a need.
- `action.handler / disabled / visible` predicates — function-typed; not representable in JSON.
