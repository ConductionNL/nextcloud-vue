# saved-views-ui Delta: saved-view-overrides

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A view can override the page config while it is active

A default view's `overrides`, or a saved view's `query.overrides`, SHALL be laid over the index page's config while that view is applied. Only the allowed page config keys, `header`, the aliases `tabs` and `views`, `sortOption`, `slots` and `badge` SHALL be read. Clearing the view, applying a view without overrides, or following a link to the page without `savedView` SHALL restore the page's own config.

#### Scenario: Assigned to me opens in cards with its own header

- **GIVEN** the Cases page declares the default view `my-work` with `overrides: { title, viewMode: 'cards', viewModes: ['cards', 'table'], columns }`
- **WHEN** the reader opens the view
- **THEN** the page shows that title, opens in cards with a cards/table toggle, and lists those columns

#### Scenario: Leaving the view restores the page

- **GIVEN** the view `my-work` is applied
- **WHEN** the reader clears it, or follows the plain Cases menu entry
- **THEN** the page shows its own title, view modes and columns again

#### Scenario: The team queue keeps its base filter

- **GIVEN** a view with `lockedFilters: { assignee: 'IS NULL' }`
- **WHEN** it is applied
- **THEN** the list shows only unassigned cases, and clearing the filters does not remove that condition

#### Scenario: A view fills a slot

- **GIVEN** a view with `slots: { 'below-header': ['WorkloadSummaryBar'] }`
- **WHEN** it is applied
- **THEN** the registry component WorkloadSummaryBar is drawn below the header, and only while the view is active

### Requirement: A view can select a sort option

A view's `overrides.sortOption` SHALL select the sidebar sort entry (`sortSelectOptions`) with that value when the view is applied, including one whose rows come from an endpoint. Leaving the view SHALL undo an endpoint order the view selected.

#### Scenario: Assigned to me is ordered by urgency

- **GIVEN** a view with `sortOption: 'urgency'` and a sort option `urgency` with an endpoint source
- **WHEN** the view is applied
- **THEN** the list shows the endpoint's rows in its order

### Requirement: A view in the menu can show a count

A view's `overrides.badge` SHALL put a count on its "My views" menu entry. `true`, or `count: true`, SHALL count the view's own list: the page's register, schema and base filter with the view's filters. `counterVariant: attention` SHALL draw the attention pill.

#### Scenario: The team queue shows how many cases wait

- **GIVEN** the default view `team-queue` with `badge: { counterVariant: 'attention' }`, added to the menu
- **WHEN** the menu draws
- **THEN** its entry shows the number of cases matching the view, as an attention pill

### Requirement: A board card can draw a description, chips and an overdue date

The board card's record layout SHALL draw `description` as a line cut at `maxLength` characters (140 by default), `chips` as one pill per entry whose field holds a value, its text read through the entry's formatter, and `footerDate` in its `overdueVariant` tone once the date has passed.

#### Scenario: Assigned to me as cards

- **GIVEN** a card layout with `description: { field: 'description', maxLength: 140 }`, `chips: [{ field: 'caseType', formatter: 'caseTypeName' }]` and `footerDate: { field: 'deadline', overdueVariant: 'error' }`
- **WHEN** a case past its deadline is drawn
- **THEN** the card shows the cut description, the case type by name, and the deadline in red
