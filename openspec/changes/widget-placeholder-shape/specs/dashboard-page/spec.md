# dashboard-page Delta: widget-placeholder-shape

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-placeholder-shape](../../)

## Purpose

`CnDashboardPage` shows each waiting widget in its declared shape and announces loading once for the page.

## MODIFIED Requirements

### Requirement: A conditional widget waits in its own cell

CnDashboardPage SHALL NOT hold up the grid while widget `visibleWhen` predicates are evaluated. In live mode the grid
SHALL render at once. A widget whose non-workspace `visibleWhen` has no verdict yet SHALL keep its cell and show its
wrapper with `loading` true and the widget's resolved placeholder (widget-placeholder), without a status of its own;
every other widget SHALL render as usual. When the verdict arrives the widget SHALL show if it is met, or leave its
cell (the rest close up) if it is not. A workspace condition is answered at once and is never pending; edit mode shows
every widget and has nothing pending. (Decision 27 Nov 2026: no widget holds up the first render of a dashboard; this
replaces holding the grid's first paint until the predicates settle. Decision 27 Nov 2026: a waiting widget shows its
declared shape, not "Loading…".)

#### Scenario: the grid renders while a banner's condition is being read

- GIVEN a dashboard with a banner whose `visibleWhen` reads an endpoint, and a neighbouring widget
- WHEN the page renders and the endpoint has not answered yet
- THEN the grid is shown, the neighbour renders, and the banner's cell shows the banner's placeholder shape

#### Scenario: an unmet verdict gives the cell up when it arrives

- GIVEN the banner's cell shows its placeholder
- WHEN the endpoint answers a value that does not meet the condition
- THEN the banner's cell leaves and the neighbour moves up

## ADDED Requirements

### Requirement: Each widget waits in its declared shape

CnDashboardPage SHALL pass every widget's resolved placeholder (widget-placeholder) to its `CnWidgetWrapper` and SHALL
hold that wrapper's `loading` true from first render until the widget's renderer emits `loaded`, or until its first
render completes for a renderer that does not emit `loaded`. An error SHALL end the wait; the widget then shows its
error state.

#### Scenario: A list widget shows rows until its items arrive

- GIVEN a dashboard with an `object-table` widget whose source answers after 2 seconds
- WHEN the page renders
- THEN the widget shows its title and rows until the items arrive, then the table in the same cell

#### Scenario: A KPI widget shows a counter shape

- GIVEN a dashboard with a `stat` widget, declared `counter` in the registry
- WHEN the page renders before its value has arrived
- THEN the widget shows a number block and a label line

### Requirement: One status line announces the page's loading

CnDashboardPage SHALL render one visually hidden element with `role="status"` that reads "Loading widgets" while any
widget in the viewport is loading, and "All widgets loaded" once when the last of them has loaded, and is then emptied.
Its text SHALL change at most once every 2 seconds. No widget SHALL announce its own loading.

#### Scenario: A screen reader hears the page, not every widget

- GIVEN Fatima uses a screen reader and opens a dashboard with six widgets that fetch
- WHEN the widgets load
- THEN she hears "Loading widgets" and later "All widgets loaded", once each
- AND no placeholder is read
