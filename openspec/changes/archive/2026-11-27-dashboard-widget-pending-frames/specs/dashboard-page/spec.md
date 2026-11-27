# dashboard-page Delta: dashboard-widget-pending-frames

## ADDED Requirements

### Requirement: A conditional widget waits in its own cell

CnDashboardPage SHALL NOT hold up the grid while widget `visibleWhen` predicates are evaluated. In live mode the grid
SHALL render at once. A widget whose non-workspace `visibleWhen` has no verdict yet SHALL keep its cell and show a
loading state there (a busy status, "Loading…"); every other widget SHALL render as usual. When the verdict arrives the
widget SHALL show if it is met, or leave its cell (the rest close up) if it is not. A workspace condition is answered at
once and is never pending; edit mode shows every widget and has nothing pending. (Decision 27 Nov 2026: no widget holds
up the first render of a dashboard; this replaces holding the grid's first paint until the predicates settle.)

#### Scenario: the grid renders while a banner's condition is being read

- GIVEN a dashboard with a banner whose `visibleWhen` reads an endpoint, and a neighbouring widget
- WHEN the page renders and the endpoint has not answered yet
- THEN the grid is shown, the neighbour renders, and the banner's cell shows a loading state

#### Scenario: an unmet verdict gives the cell up when it arrives

- GIVEN the banner's cell shows a loading state
- WHEN the endpoint answers a value that does not meet the condition
- THEN the banner's cell leaves and the neighbour moves up

