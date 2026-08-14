## ADDED Requirements

### Requirement: The library ships a flow-runs widget any app can place

The library SHALL register a `flow-runs` widget type in the shared dashboard
widget registry, resolvable from any app's manifest placement without the app
providing a component, a store, or an endpoint.

The widget SHALL read the live flow runs from OpenRegister's active-runs
surface. The endpoint address SHALL NOT be a configuration field: there is one
flow engine per instance, and making its address per-app configurable would
invite each app to get it slightly wrong.

#### Scenario: A manifest placement renders the widget

- **GIVEN** a dashboard placement of type `flow-runs`
- **WHEN** the dashboard renders
- **THEN** the flow-runs widget is mounted with the placement's content

### Requirement: The widget shows the flow's name, its step, and its age

Each row SHALL render the run's flow NAME, its status, and how long the run has
been going. A row SHALL additionally render the step the run currently sits on
and what triggered it when the run carries them.

The age SHALL be coarse (minutes / hours / days, and "now" under a minute).
Second-precision on a widget that refetches every 15 seconds would read as
stale between polls.

#### Scenario: A run's row identifies the flow and where it is

- **GIVEN** a live run of a named flow, waiting on a step
- **WHEN** the widget renders
- **THEN** the row shows the flow name, the status, and the step

### Requirement: The widget refetches on an interval

The widget SHALL refetch on a configurable interval, defaulting to 15 seconds.

A configured interval of `0` SHALL disable polling. A positive interval SHALL be
floored at 5 seconds, so a mis-authored fractional value cannot turn a dashboard
into a request storm.

Polling SHALL stop while the document is hidden, and SHALL refetch once and
resume when it becomes visible again — so returning to a backgrounded dashboard
shows current state, and an unattended tab is not a background request loop.

The widget SHALL ALSO refetch on the page-level refresh signal, like every other
endpoint-bound widget.

#### Scenario: A hidden tab stops polling

- **GIVEN** a mounted widget with polling enabled
- **WHEN** the document becomes hidden
- **THEN** no further refetches are issued
- **AND** becoming visible again issues one refetch and resumes the interval

#### Scenario: Polling can be switched off

- **GIVEN** a placement configured with a poll interval of `0`
- **WHEN** the widget mounts
- **THEN** no interval is started

### Requirement: The widget states what it could not fit

The widget SHALL render at most the configured number of rows, and SHALL state
how many further live runs exist, using the total reported by the endpoint
rather than the length of the rendered list.

The remainder SHALL NOT be reachable by scrolling inside the widget: a tile's
cell is the budget.

#### Scenario: More runs exist than rows shown

- **GIVEN** an endpoint reporting a total larger than the row limit
- **WHEN** the widget renders
- **THEN** the rendered rows are capped to the limit
- **AND** the count of remaining runs is shown

### Requirement: Nothing running is a normal state

When no runs are live, the widget SHALL render one quiet line, overridable by
the placement. It SHALL NOT render an error, and SHALL NOT render a full-height
empty illustration.

A failed read SHALL render one quiet line WITHOUT the underlying request's
status text.

#### Scenario: An idle engine reads as idle, not broken

- **GIVEN** an endpoint returning no runs
- **WHEN** the widget renders
- **THEN** the empty line is shown and no error is shown

### Requirement: Row clicks are opt-in and carry the flow id

A row SHALL be clickable only when the placement configures a route name.
Without one, rows SHALL NOT be interactive — an app with no flow page has
nowhere to send the click.

When configured, the click SHALL navigate to that route with the run's FLOW id
as the `id` parameter.

#### Scenario: An unconfigured widget has inert rows

- **GIVEN** a placement with no row route
- **WHEN** a row is clicked
- **THEN** no navigation occurs

### Requirement: An index page opens rows on an explicitly named route

A `type:"index"` page's `config.rowRoute` SHALL name the route a row click
opens, and SHALL take precedence over the route derived from a matching
`type:"detail"` page.

This is what lets an index open a detail surface that is NOT a `type:"detail"`
page — an authoring canvas, a form page, a page over another register. Before
this, the key parsed and validated and had no effect, so an index that authored
it rendered rows that were dead on click and indistinguishable from a broken
table.

A row click SHALL still be enabled when only a matching detail page exists, as
before.

#### Scenario: A custom detail page opens from the index

- **GIVEN** an index page whose `config.rowRoute` names a `type:"custom"` page
- **WHEN** a row is clicked
- **THEN** that page is opened with the row's id

#### Scenario: rowRoute wins over the detail-page lookup

- **GIVEN** an index page with both a `config.rowRoute` and a matching detail page
- **WHEN** a row is clicked
- **THEN** the route named by `config.rowRoute` is opened

### Requirement: An unknown row route is reported, not swallowed

When a row's target route name is not registered on the router, the renderer
SHALL report it once, naming the page and the route, and SHALL NOT navigate.

A row click that resolves to nothing is invisible to the user and looks exactly
like a broken table, so the mistake SHALL be stated rather than left as a
silently rejected navigation.

When the router cannot be asked whether a name exists, navigation SHALL proceed
— an unanswerable question SHALL NOT block a working row click.

#### Scenario: A misspelled route name names itself

- **GIVEN** an index page whose `config.rowRoute` is not a registered route
- **WHEN** a row is clicked
- **THEN** no navigation occurs
- **AND** a warning naming the page and the route is emitted
