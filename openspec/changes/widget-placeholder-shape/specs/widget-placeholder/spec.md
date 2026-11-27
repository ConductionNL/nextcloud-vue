# widget-placeholder Delta: widget-placeholder-shape

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-placeholder-shape](../../)

## Purpose

Every dashboard widget declares the shape of the placeholder it shows while its content loads, and every host draws
that shape the same way: `CnWidgetWrapper` in the browser and a server template before any script runs.

## ADDED Requirements

### Requirement: A widget declares its placeholder shape

A dashboard widget SHALL be able to declare `placeholder` as one of `rows`, `lines`, `block`, `tiles`, `counter` or
`heading`, or as an object `{ shape, count }` where `shape` is one of those values and `count` is an integer from 1 to
24. The app manifest schema SHALL accept `placeholder` on `widgetDef` (schema version 1.9.0) and reject any other shape
name. `registerDashboardWidget` SHALL accept `placeholder` on a registry entry and SHALL throw a `TypeError` naming the
type when the value is not a valid shape, whether the library or an app registers the type. A type's declaration SHALL
cover every widget of that type unless the widget declares its own. Every widget type this library registers SHALL
declare a placeholder.

#### Scenario: A manifest widget declares its shape

- GIVEN a manifest dashboard widget `{ "id": "open-cases", "type": "custom", "placeholder": { "shape": "rows", "count": 5 } }`
- WHEN the manifest is validated against the schema
- THEN it is valid

#### Scenario: An unknown shape is refused

- GIVEN a manifest dashboard widget with `"placeholder": "spinner"`
- WHEN the manifest is validated against the schema
- THEN validation fails on `placeholder`

#### Scenario: Every library widget type declares a shape

- GIVEN the library's widget types have registered into `dashboardWidgetRegistry`
- WHEN the registry is read
- THEN every entry has a valid `placeholder`

### Requirement: The declared shape is resolved in one order

`resolveWidgetPlaceholder(widgetDef, registryEntry, ncDescriptor)` SHALL return `{ shape, count }` from, in this order,
the manifest widget declaration, the registry entry for the widget's type, the descriptor of a Nextcloud dashboard API
widget, and otherwise `{ shape: 'rows' }`. Every host in this library SHALL use it.

#### Scenario: The manifest wins over the registry

- GIVEN the registry declares `chart` as `block`
- AND a manifest widget of type `chart` declares `counter`
- WHEN the shape is resolved
- THEN it is `counter`

#### Scenario: An app-registered type covers every widget of the type

- GIVEN an app registers the type `traffic-kpi` with placeholder `counter`
- AND its manifest has four widgets of that type, one of which declares `block`
- WHEN the shapes are resolved
- THEN three widgets get `counter` and the one that declares `block` gets `block`

#### Scenario: A widget of another vendor draws rows

- GIVEN a Nextcloud dashboard widget `weather_status` whose descriptor declares no placeholder
- WHEN the shape is resolved
- THEN it is `rows`

#### Scenario: A Conduction Nextcloud widget uses its declaration

- GIVEN a Nextcloud dashboard widget whose descriptor carries `placeholder: "counter"`
- WHEN the shape is resolved
- THEN it is `counter`

### Requirement: CnWidgetPlaceholder draws one shape

`CnWidgetPlaceholder` SHALL take `shape` (default `rows`) and `count` (optional) and SHALL render the markup contract of
design D4 with `aria-hidden="true"`. With a count it SHALL draw that many items, clipped to its container; without one
it SHALL fill its container's height (rows at 44 px, lines at 24 px, tiles as many as fit) and never overflow it. The
shape `heading` SHALL render nothing. It SHALL use Nextcloud colour variables only. Its shimmer SHALL last 1.8 s and
SHALL NOT run under `prefers-reduced-motion: reduce`.

#### Scenario: Rows fill the content area

- GIVEN a `CnWidgetPlaceholder` with shape `rows` and no count in a content area 220 px high
- WHEN it renders
- THEN it draws 5 rows of an icon square and two lines
- AND the placeholder is hidden from assistive technology

#### Scenario: A count is clipped to the space

- GIVEN a `CnWidgetPlaceholder` with shape `rows`, count 12, in a content area 132 px high
- WHEN it renders
- THEN it draws 3 rows and nothing overflows the content area

#### Scenario: No shimmer with reduced motion

- GIVEN a user whose system asks for reduced motion
- WHEN a placeholder renders
- THEN it shows without animation

### Requirement: The declarations and the look are available to a server

The package SHALL publish `widget-placeholders.json`, mapping every registered library widget type to its declared
`{ shape, count? }`, generated at build time from the registry, and `css/widget-placeholder.css`, the placeholder
styles without any other library CSS. A server template that prints the markup contract and inlines that CSS SHALL draw
the same placeholder as `CnWidgetPlaceholder`.

#### Scenario: A PHP host reads the same shape

- GIVEN the library registers `object-table` with placeholder `rows`
- WHEN the package is built
- THEN `widget-placeholders.json` maps `object-table` to `{ "shape": "rows" }`

#### Scenario: The server markup matches the component

- GIVEN the markup contract printed for `lines` with 4 lines, and `CnWidgetPlaceholder` with shape `lines`, count 4
- WHEN both render with `css/widget-placeholder.css`
- THEN they have the same element structure, classes and size
