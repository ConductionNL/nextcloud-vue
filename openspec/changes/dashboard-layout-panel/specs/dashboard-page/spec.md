# dashboard-page Delta: dashboard-layout-panel

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-layout-panel](../../)

## Purpose

Let a user show, hide and reorder a dashboard's sections for themselves.

## ADDED Requirements

### Requirement: A user arranges the page in a side panel

With `layoutPanel: true` CnDashboardPage SHALL draw an "Arrange page" header button that opens and closes a side
panel listing the grid's sections (the KPI row left out) in reading order, each with a checkbox (shown or hidden) and a
handle that moves it by drag or by the arrow keys. "Save layout" SHALL store the order and the hidden sections per user
through the user layout store and close the panel; the n-th section in the new order takes the column, row and width of
the n-th section in the old order. A hidden section SHALL NOT be drawn. "Back to default" SHALL reset the user layout.
Without the key the page SHALL draw no button and make no layout request.

#### Scenario: Reorder and hide

- **GIVEN** `layoutPanel: true` and the sections Urgent (0,0), Appointments (8,0) and Waiting on me (0,3)
- **WHEN** the user saves Waiting on me, Urgent, then Appointments hidden
- **THEN** Waiting on me is stored at (0,0), Urgent at (8,0), Appointments with `hidden: true`, and the grid draws Waiting on me and Urgent only
