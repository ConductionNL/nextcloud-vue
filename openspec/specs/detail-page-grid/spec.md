# Detail Page Grid Specification

## Purpose

Extends `CnDetailPage` with optional grid layout mode, allowing detail pages to arrange content widgets in a 12-column CSS grid instead of vertical stacking. Uses the same grid engine as `CnDashboardPage` for visual and API consistency.
## Requirements
### Requirement: CnDetailPage supports optional grid layout

`CnDetailPage` SHALL accept optional `layout` and `widgets` props (same shape as `CnDashboardPage`). When `layout` is provided, content MUST render in a 12-column CSS grid using `#widget-{widgetId}` scoped slots. When `layout` is null (default), existing vertical stacking behavior MUST be preserved.

#### Scenario: Grid mode with layout prop
- GIVEN a CnDetailPage with `layout` and `widgets` props provided
- WHEN the component renders
- THEN the content area uses a 12-column CSS grid
- AND each layout item renders its corresponding `#widget-{widgetId}` slot
- AND the sidebar (if enabled) remains outside the grid

#### Scenario: Backwards compatible without layout
- GIVEN a CnDetailPage WITHOUT a `layout` prop
- WHEN the component renders
- THEN the default slot renders content in a vertical stack (flex column)
- AND existing CnDetailCard components render as before

#### Scenario: Grid with sidebar
- GIVEN a CnDetailPage with `layout` prop and `sidebar` enabled
- WHEN the component renders
- THEN the grid content area and sidebar render side by side
- AND the sidebar toggle works as before

### Requirement: Grid layout uses same API as CnDashboardPage

The `layout` and `widgets` props on CnDetailPage MUST use the same shape as CnDashboardPage: `widgets: [{ id, title }]` and `layout: [{ id, widgetId, gridX, gridY, gridWidth, showTitle? }]`.

#### Scenario: Same layout format
- GIVEN a layout array `[{ id: 1, widgetId: 'info', gridX: 0, gridY: 0, gridWidth: 8 }]`
- WHEN used on CnDetailPage
- THEN it renders identically to the same layout on CnDashboardPage
- AND the CSS grid placement uses the same `widgetGridStyle()` computation

### Requirement: Widget slots receive item and widget context

Each `#widget-{widgetId}` scoped slot MUST receive `item` (the layout item) and `widget` (the widget definition) as slot props, matching CnDashboardPage's slot interface.

#### Scenario: Slot props
- GIVEN a CnDetailPage with a widget slot `#widget-details`
- WHEN the slot renders
- THEN it receives `{ item: { id, widgetId, gridX, ... }, widget: { id, title } }` as slot props

### Requirement: REQ-DPG-COLLAB-001 — `CnDetailPage` auto-subscribes by default

`CnDetailPage` MUST call `useObjectSubscription(register, schema, objectId)` when its `register`, `schema`, and `objectId` props are all set, UNLESS the manifest sets `pages[].config.subscribe: false`.

#### Scenario: Default behaviour subscribes

- GIVEN a CnDetailPage mounted with `register='decidesk'`, `schema='meeting'`, `objectId='uuid-1'`
- WHEN the component finishes mounting
- THEN `objectStore.subscribe('meeting', 'uuid-1')` MUST be called exactly once

#### Scenario: Opt-out skips subscription

- GIVEN a manifest page with `config.subscribe: false`
- WHEN CnDetailPage mounts
- THEN `objectStore.subscribe` MUST NOT be called

---

### Requirement: REQ-DPG-COLLAB-002 — `CnDetailPage` lock-on-edit gating

When the user toggles edit mode, `CnDetailPage` MUST call `useObjectLock.acquire()` BEFORE flipping internal `editing` state to `true`. If `acquire()` rejects with `LockConflictError`, the edit toggle MUST stay disabled and a `CnLockedBanner` MUST render with the conflicting user. If it rejects with `PermissionError`, edit mode MUST proceed AND a one-time toast warns the user.

#### Scenario: Edit mode acquires lock first

- GIVEN a CnDetailPage with `lock` not opted-out and an unlocked object
- WHEN the user clicks the Edit toggle
- THEN `acquire()` MUST be called
- AND only after `acquire()` resolves, `editing` MUST become `true`

#### Scenario: Conflict suppresses edit + shows banner

- GIVEN the object is locked by user B
- WHEN the user clicks Edit
- THEN `acquire()` rejects with `LockConflictError`
- AND `editing` MUST remain `false`
- AND a `CnLockedBanner` component MUST render with B's displayName and the lock expiry

#### Scenario: Permission denied falls back to edit-without-lock

- GIVEN the user does NOT have the `lock` permission on the schema
- WHEN the user clicks Edit
- THEN `acquire()` rejects with `PermissionError`
- AND `editing` MUST become `true`
- AND a toast warns "Concurrent edits are not blocked on this schema"

---

### Requirement: REQ-DPG-COLLAB-003 — Save / cancel release the lock

When `editing` flips back to `false` (via Save success, Cancel, or navigation away), `CnDetailPage` MUST call `release()` if the current user holds the lock.

#### Scenario: Save releases

- GIVEN the user is editing with a held lock
- WHEN Save succeeds and `editing` becomes `false`
- THEN `release()` MUST be called
- AND `lockedByMe.value` MUST become `false`

#### Scenario: Cancel releases

- GIVEN the user is editing with a held lock
- WHEN Cancel is clicked
- THEN `release()` MUST be called

#### Scenario: Navigation releases

- GIVEN the user is editing with a held lock
- WHEN the route changes
- THEN `release()` MUST be called via `tryOnScopeDispose`

---

### Requirement: REQ-DPG-COLLAB-004 — Manifest opt-out fields

`pages[].config` MUST accept two optional Boolean fields `subscribe` and `lock`. Both default to `true`. The manifest schema MUST validate them.

#### Scenario: Manifest with `subscribe: false`

- GIVEN `pages[].config.subscribe = false`
- WHEN `validateManifest` runs
- THEN no validation errors are produced
- AND the rendered CnDetailPage skips `useObjectSubscription`

#### Scenario: Manifest with `lock: false`

- GIVEN `pages[].config.lock = false`
- WHEN the user clicks Edit
- THEN `acquire()` MUST NOT be called
- AND `editing` flips to `true` directly

## MODIFIED Requirements

_None — CnDetailPage is only extended, not changed._

## REMOVED Requirements

_None._

---

## Implementation Reality Notes (Added 2026-03-16)

### Current Behavior: How CnDetailPage renders today

CnDetailPage uses a **flexbox layout** (not CSS Grid):

- `.cn-detail-page__body`: `display: flex; gap: 20px; align-items: flex-start;`
- `.cn-detail-page__content`: `flex: 1; display: flex; flex-direction: column; gap: 16px;` — this is the vertical stacking
- `.cn-detail-page__sidebar`: `width: 340px; flex-shrink: 0; position: sticky; top: 20px;`
- At `<= 900px`: body goes to `flex-direction: column`, sidebar goes full width

Content is provided via a default slot (`<slot />`). Apps place `CnDetailCard` components inside this slot, which stack vertically with 16px gaps.

The sidebar is powered by CnObjectSidebar (for files, notes, tags, tasks, audit trail). It sits outside the content area in the flex container.

### Conflict Notes

1. **"Grid layout uses same API as CnDashboardPage"** — The layout data format (gridX, gridY, gridWidth, gridHeight) can be shared, but the rendering engines will differ. CnDashboardPage uses GridStack (absolute positioning, drag-and-drop); CnDetailPage will use the new CSS Grid mixin (static grid-column placement). Visual output will be similar but not pixel-identical due to different sizing models (GridStack uses `cellHeight` in pixels; CSS Grid uses `auto` or `minmax` row heights).

2. **Slot naming consistency** — CnDashboardPage's internal slot is `#widget` (passed from CnDashboardGrid), which it then dispatches to `#widget-{widgetId}` scoped slots. CnDetailPage should use the same `#widget-{widgetId}` scoped slot pattern but will NOT have an intermediate `#widget` slot since there's no CnDashboardGrid involved.

3. **Sidebar coexistence** — The sidebar currently uses `flex` layout to sit beside content. When grid mode is enabled, the grid should replace only the content area (`.cn-detail-page__content`), while the flex wrapper (`.cn-detail-page__body`) continues to manage the content+sidebar split. This means the CSS Grid applies inside the content div, not at the body level.

### Missing Accessibility Notes

- **Grid layout container**: Should NOT use `role="grid"` since this is a presentational layout, not an interactive data grid. No ARIA grid roles needed.
- **Landmark regions**: Each widget section rendered in the grid should ideally be a `<section>` with an `aria-labelledby` pointing to its widget title, so screen readers can navigate by region.
- **Focus order**: CSS Grid `order` property should not be used (or if used, must match DOM order) to ensure focus order matches visual order per WCAG 2.4.3.
- **Content reflow**: At `< 600px` single-column mode, all widgets must reflow without horizontal scrolling per WCAG 1.4.10 (Reflow).
