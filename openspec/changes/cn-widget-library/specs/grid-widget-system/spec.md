## MODIFIED Requirements

### Requirement: Widget components are exported from the library barrel

All widget components MUST be exported from `src/components/index.js` and `src/index.js`. This includes the original grid widgets (CnKpiWidget, CnInfoWidget, CnTableWidget, CnChartWidget) AND the dashboard widget catalog moved into the library: every `Cn<Name>Widget` renderer and `Cn<Name>WidgetForm` form (label, text, image, link, divider, header, quicklinks, video, news, container, tile, menu, links, files, people, calendar, nc-widget, spend-analytics), the `CnAddWidgetModal`, `CnWidgetStyleEditorModal`, and `CnWidgetVisibilityRulesModal` modals, the `CnMenuItemEditor` / `CnTextTableEditor` / `CnNcWidgetGridPicker` sub-editors, the `useWidgetForm` composable, and the `dashboardWidgetRegistry` plus `registerDashboardWidget` / `getWidgetTypeEntry` / `listWidgetTypes` / `getDefaultContent` registry helpers.

#### Scenario: Import original grid widgets from library
- GIVEN an app imports `{ CnKpiWidget, CnTableWidget } from '@conduction/nextcloud-vue'`
- WHEN the app builds with webpack
- THEN the imports resolve successfully

#### Scenario: Import catalog widgets and registry from library
- GIVEN an app imports `{ CnAddWidgetModal, CnLabelWidget, dashboardWidgetRegistry, registerDashboardWidget } from '@conduction/nextcloud-vue'`
- WHEN the app builds
- THEN every catalog widget, modal, sub-editor, composable, and registry helper resolves successfully through the barrel

## ADDED Requirements

### Requirement: Widget key resolution composes the built-in, catalog, and consumer registries

`CnWidgetGrid` SHALL resolve a manifest `widgetKey` through one ordered lookup — first `BUILT_IN_WIDGETS` (v2 manifest widgets), then the shared `dashboardWidgetRegistry` (catalog widgets), then the consumer-supplied `cnRegistry` inject — so a consumer override always wins, the v2 built-ins and the dashboard catalog stay independent registries, and a manifest can reference a catalog widget by its registry `type` key.

#### Scenario: Built-in v2 key resolves first
- WHEN a manifest places `widgetKey: 'object-table'`
- THEN `CnWidgetGrid` resolves it from `BUILT_IN_WIDGETS` as before, unaffected by the catalog

#### Scenario: Catalog key resolves from the dashboard registry
- WHEN a manifest places `widgetKey: 'label'` and `label` exists only in `dashboardWidgetRegistry`
- THEN `CnWidgetGrid` resolves it to `CnLabelWidget` from the dashboard registry

#### Scenario: Consumer override wins last
- WHEN an app registers a component for an existing key in its `cnRegistry` inject
- THEN `CnWidgetGrid` resolves that key to the consumer's component, overriding both `BUILT_IN_WIDGETS` and `dashboardWidgetRegistry`
