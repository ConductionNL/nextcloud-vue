# view-switch-containers Delta: view-switch-containers

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [view-switch-containers](../../)

## Purpose

Let a dashboard or detail page offer a few views of its content, each its own
widget grid, behind one segmented control.

## ADDED Requirements

### Requirement: A page declares views that each hold a widget grid

CnDashboardPage and CnDetailPage SHALL accept `views`, a list of
`{ id, label, icon?, widgets, layout, emptyText? }`. The page SHALL render the
chosen view's `layout` with the same grid component and widget rendering it
uses for its own `layout`, in a region below the page's own grid. Choosing
another view SHALL replace the region's widgets with that view's widgets.
`defaultView` names the view chosen when nothing else decides; without it the
first view is chosen. The page's own `widgets` and `layout` keep rendering
above the region.

#### Scenario: Switching renders the other view's widgets

- **GIVEN** a dashboard with views `mine` (widget `my-cases`) and `team` (widget `team-cases`)
- **WHEN** the user chooses `team` in the switch
- **THEN** the region shows `team-cases` and no longer shows `my-cases`

#### Scenario: The default view opens first

- **GIVEN** a page with views `mine` and `team` and `defaultView: "team"`, no `view` in the address and nothing stored
- **WHEN** the page renders
- **THEN** the `team` view is checked and its widgets render

#### Scenario: A detail page switches views in its header

- **GIVEN** a detail page with views `overview` and `documents`
- **WHEN** the user chooses `documents` in the switch in the page header
- **THEN** the region shows the `documents` widgets

### Requirement: The chosen view is linkable and remembered

The page SHALL write the chosen view to the address as the `view` query
parameter (replacing the history entry) and to the browser store under a key
made of the page id. On load the page SHALL take the view from the address
first, then from the store, then `defaultView`, then the first view. An id
that names no view SHALL be ignored.

#### Scenario: The address wins over the stored view

- **GIVEN** `team` is stored for the page and the address carries `?view=mine`
- **WHEN** the page renders
- **THEN** the `mine` view is checked

#### Scenario: A chosen view is written to the address and the store

- **WHEN** the user chooses `team`
- **THEN** the router replaces the address with `view=team` in its query, keeping the other query keys
- **AND** the store holds `team` for this page

#### Scenario: A stored view opens when the address names none

- **GIVEN** `team` is stored for the page and the address carries no `view`
- **WHEN** the page renders
- **THEN** the `team` view is checked

### Requirement: A greeting header can switch the page's views

CnHeaderWidget SHALL accept `content.views.options[]` entries with a `view`
instead of a `route`. Such an option selects that view of the page the widget
sits on. When a widget in the page's own `widgets` declares such options, the
page SHALL NOT draw a second switch. Options with a `route` SHALL keep
navigating as before.

#### Scenario: The header switch selects a view

- **GIVEN** a dashboard whose greeting header has options `{ label: "My work", view: "mine" }` and `{ label: "My team", view: "team" }`
- **WHEN** the user chooses "My team" in the header
- **THEN** the region shows the `team` view's widgets and the page draws no second switch

#### Scenario: Route options keep navigating

- **GIVEN** a header with options carrying `route`
- **WHEN** the user chooses one
- **THEN** the router pushes that route

### Requirement: The view switch is accessible

The switch SHALL be a radio group with an accessible name (`viewsLabel`, else
"View") whose options carry `aria-controls` pointing at the view region. The
region SHALL be a `region` landmark named after the chosen view. Arrow keys,
Home and End SHALL move the choice, and focus SHALL stay on the control after
the view changes.

#### Scenario: The options control the region

- **WHEN** a page with views renders
- **THEN** every option's `aria-controls` equals the region's `id`, and the region has `role="region"` and the chosen view's label as its name

#### Scenario: Focus stays on the control

- **GIVEN** focus is on the checked option
- **WHEN** the user presses the right arrow key
- **THEN** the next view is chosen and focus is on its option

#### Scenario: No axe violations

- **WHEN** a dashboard with views renders
- **THEN** axe reports no violations for the switch and the region

### Requirement: A view with nothing to draw says so

When the chosen view has no layout entries, or every entry is hidden, the
region SHALL show an empty state with a sentence: the view's `emptyText`, else
"This view has no widgets yet."

#### Scenario: An empty view shows a sentence

- **GIVEN** a view `team` with no widgets
- **WHEN** the user chooses it
- **THEN** the region shows "This view has no widgets yet." and no grid
