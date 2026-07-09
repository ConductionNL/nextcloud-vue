# json-manifest-renderer (delta)

## MODIFIED Requirements

### Requirement: Page resolution is indexed, not re-scanned

`CnPageRenderer` SHALL resolve a page by route name and resolve the
detail page bound to an index page's register+schema via indexes built once
per effective-manifest identity, not by re-scanning `pages[]` on each
recompute.

#### Scenario: current page resolves by id index

- **WHEN** the route name matches a `pages[].id`
- **THEN** `currentPage` SHALL return that page via the `pageById` map
- **THEN** the map SHALL be rebuilt only when the effective manifest changes

#### Scenario: index row-click finds its detail page by register+schema index

- **WHEN** an index page declares `config.register` + `config.schema` and a
  detail page binds the same pair
- **THEN** the row-click-to-view wiring and `onRowOpen` SHALL locate the detail
  page via the `detailPageByRegisterSchema` map
- **THEN** the first detail page for a given pair wins

### Requirement: Unresolved widgets render a visible placeholder

`CnWidgetGrid` SHALL render a visible placeholder for a widget whose
`widgetKey` resolves to no component, rather than dropping it silently.

#### Scenario: unknown widgetKey renders placeholder + warns

- **WHEN** a widget's `widgetKey` matches no registry entry, built-in, or
  dashboard-catalog widget
- **THEN** the grid SHALL render the `CnUnknownWidget` placeholder carrying the
  unresolved key
- **THEN** the grid SHALL still emit a `console.warn` naming the key and slot
- **THEN** a page whose widgets all fail to resolve SHALL NOT render blank
