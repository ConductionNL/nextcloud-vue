# Dashboard Page — Workspace Context

**Spec refs**: `dashboard-page`
**Standards**: ADR-022 (apps consume library abstractions)

## MODIFIED Requirements

### Requirement: widget type resolution

CnDashboardPage SHALL resolve the widget type for each layout item in the following priority order: (1) tile widget, (2) custom scoped slot, (3) NC Dashboard API widget, (4) registered dashboard-widget-registry kind, (5) unknown fallback. The widget definition is looked up from the `widgets` array using the layout item's `widgetId` field. In addition, CnDashboardPage SHALL provide a reactive `cnWorkspaceContext` bag (a `ref({})`) to all widget descendants — provided unconditionally and starting empty — so widgets can share page-level state (one widget writes a key, sibling widgets read it).

#### Scenario: tile widget detection

- GIVEN a layout item with `widgetId: 'quick-link'` and the matching widget definition has `type: 'tile'`
- WHEN the grid renders that item
- THEN `CnTileWidget` is rendered with tile config extracted from the widget definition (title, icon, iconType, backgroundColor, textColor, linkType, linkValue)

#### Scenario: custom widget via scoped slot

- GIVEN a layout item with `widgetId: 'kpis'` and `#widget-kpis` scoped slot is provided and the widget definition does NOT have `type: 'tile'`
- WHEN the grid renders that item
- THEN the scoped slot content is rendered inside a `CnWidgetWrapper` with `{ item, widget }` as slot props

#### Scenario: NC Dashboard API widget

- GIVEN a layout item with `widgetId: 'weather'` and the widget definition has `itemApiVersions: [1, 2]` and no `#widget-weather` slot exists and type is not `'tile'`
- WHEN the grid renders that item
- THEN `CnWidgetRenderer` is rendered inside a `CnWidgetWrapper`, auto-fetching items from the NC Dashboard API

#### Scenario: registered widget kind

- GIVEN a layout item whose widget definition has a `type` registered in the dashboard widget registry (e.g. `object-list`, `interaction-form`, `kb-search`) and no `#widget-<id>` slot exists and type is not `'tile'`
- WHEN the grid renders that item
- THEN the registry renderer for that `type` is rendered inside a `CnWidgetWrapper` with the widget definition's `content` passed as props

#### Scenario: unknown widget fallback

- GIVEN a layout item with `widgetId: 'mystery'` and no matching slot, no registered kind, no `itemApiVersions`, and type is not `'tile'`
- WHEN the grid renders that item
- THEN a `CnWidgetWrapper` is rendered containing the `unavailableLabel` text

#### Scenario: workspace context provided to widgets

- GIVEN any dashboard page
- WHEN it renders
- THEN a reactive `cnWorkspaceContext` bag MUST be provided to descendants so a widget can `inject('cnWorkspaceContext')` and read/write shared page state
- AND a page whose widgets never touch the bag MUST behave identically to before (the bag stays empty and inert)
