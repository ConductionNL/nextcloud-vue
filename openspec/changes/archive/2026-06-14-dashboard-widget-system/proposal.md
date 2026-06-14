# Proposal: dashboard-widget-system

## Summary

Add a grid-based widget dashboard system to `@conduction/nextcloud-vue`, porting MyDash's GridStack layout logic to the shared library. This gives every Conduction app a configurable dashboard page type (alongside the existing `CnIndexPage` list page type) without requiring MyDash as a dependency. MyDash will later become a thin client consuming these shared components.

## Motivation

Every Conduction app (procest, pipelinq, opencatalogi, etc.) has a dashboard page with KPIs, charts, and activity lists. Currently each app builds these dashboards from scratch with hardcoded layouts. Meanwhile, MyDash has a mature GridStack-based drag-and-drop grid system with widget wrappers, NC Dashboard API integration, and tile widgets — but requiring MyDash as a dependency is unacceptable for users who only want one app.

By extracting the dashboard infrastructure into the shared library:

1. **Apps get configurable dashboards for free** — drag/drop, resize, layout persistence
2. **Widgets become truly independent** — each widget fetches its own data, rendered via scoped slots
3. **Cross-app widget reuse** — any widget slot can be reused across apps
4. **NC Dashboard API integration** — apps can render any installed NC dashboard widget
5. **MyDash migration path** — MyDash becomes a thin orchestration layer on top of these components

## Affected Projects

- [x] Project: `nextcloud-vue` — Add 5 new components + 1 composable + CSS + docs
- [x] Project: `procest` — Migrate Dashboard.vue to use CnDashboardPage as proof of concept

## Scope

### In Scope

- `CnDashboardPage` — Top-level dashboard page (equivalent of CnIndexPage for dashboards)
- `CnDashboardGrid` — GridStack.js grid layout engine with drag/drop and resize
- `CnWidgetWrapper` — Widget container shell with header, content area, footer
- `CnWidgetRenderer` — Renders Nextcloud Dashboard API widgets (v1/v2) with auto-refresh
- `CnTileWidget` — Quick-access tile with icon and link
- `useDashboardView` composable — Dashboard state management (widgets, layout, NC widget loading, persistence)
- `dashboard.css` — Global dashboard styles
- CLAUDE.md documentation update
- Procest dashboard migration as test case

### Out of Scope

- Widget style configuration UI (MyDash will add that layer later)
- Widget marketplace or cross-app widget discovery
- MyDash migration (separate follow-up)
- Layout storage backend (apps implement their own via `loadLayout`/`saveLayout` callbacks)
- Widget permission system

## Approach

Port MyDash's grid components to `@conduction/nextcloud-vue` as generic, app-agnostic components. Key design decisions:

1. **Scoped slot widget system** — `#widget-{widgetId}` pattern lets each app render custom content; widgets are independent and fetch their own data
2. **Three widget types** — Custom (slot-based), NC Dashboard API (auto-rendered), Tile (quick-access links)
3. **Layout persistence delegation** — Components emit `@layout-change`, apps decide where to store layouts
4. **GridStack.js** (v10.3.1) as the grid engine — proven, maintained, no framework lock-in

## Cross-Project Dependencies

- `gridstack` npm package added to `nextcloud-vue`
- Procest uses the library via webpack alias (picks up changes immediately)
- Other apps migrate at their own pace

## Rollback Strategy

- All components are purely additive — no existing components are modified
- Procest can revert Dashboard.vue to its previous implementation (git revert)
- GridStack dependency can be removed if the approach is abandoned

## Decisions Made

- **Scoped slots over component registry**: Widgets render via `#widget-{widgetId}` slots, not a global widget registry. Keeps widgets local to the app, avoids cross-app coupling.
- **No style config**: Apps control their own widget styling. MyDash adds style configuration later.
- **GridStack over CSS Grid**: GridStack provides drag/drop/resize with minimal code. CSS Grid would require reimplementing all interaction logic.
- **Layout in app config, not OpenRegister**: Layout storage is an app concern. The composable accepts `loadLayout`/`saveLayout` callbacks.

## Open Questions

None — implementation is complete.
