## Purpose

The fleet-wide task inbox surface (ADR-098): a named `tasks` entity source so
a manifest `type: "index"` page lists the viewer's inbox, and a `tasks`
dashboard widget for the viewer's open tasks. Both consume openregister's
`flow-tasks` read and verbs; neither filters a returned page client-side.

## ADDED Requirements

### Requirement: A tasks source is registered and lists the caller's inbox

The registry SHALL resolve the name `tasks` to a source adapter that loads
`GET /apps/openregister/api/flow-tasks` and exposes the rows reactively. The
request SHALL default to `scope=assigned` and `sort=-dueAt`, and SHALL
forward `scope`, `state`, `priority`, `overdue`, `objectUuid`, `sort` and
`limit` from the loader config. The source SHALL NOT send any parameter
naming another user: whose inbox it is remains the endpoint's decision.

#### Scenario: The manifest line becomes an inbox

- **GIVEN** a manifest page `{ "type": "index", "config": { "entitySource": "tasks" } }`
- **WHEN** the page mounts
- **THEN** the source requests the flow-tasks endpoint with `scope=assigned` and `sort=-dueAt`
- **AND** the table renders the returned rows
- @e2e the tasks index renders the mocked inbox rows

#### Scenario: Loader config reaches the query

- **GIVEN** a page config with `scope: 'watched'` and `priority: 'high'`
- **WHEN** the source loads
- **THEN** the request carries `scope=watched` and `priority=high`
- @e2e exclude covered by unit tests over the request params

#### Scenario: No user parameter ever

- **GIVEN** a loader config that tries to smuggle `assignee` or `uid`
- **WHEN** the source builds its request
- **THEN** no user-naming parameter is sent
- @e2e exclude covered by unit tests over the param allowlist

### Requirement: The columns say state, due and priority in words

The source SHALL supply default columns: task title, subject, a state pill,
priority, due, assignee. The state pill SHALL carry a translated label with
its colour map keyed on that label, so state is never colour-only. The due
column SHALL say overdue in words (from the server's derived `overdue` and
`daysOverdue`), never only in colour. A manifest that declares its own
`columns` SHALL win.

#### Scenario: An overdue task says so in text

- **GIVEN** a row with `overdue: true` and `daysOverdue: 3`
- **WHEN** the rows are mapped
- **THEN** the due cell text names the overdue state and the day count
- @e2e exclude covered by unit tests over the row mapping

#### Scenario: The state renders as a labelled pill

- **GIVEN** a row with state `active`
- **WHEN** the columns render
- **THEN** the state column is a badge column whose colour map is keyed on the shown label
- @e2e exclude covered by unit tests over the column definitions

### Requirement: The source supplies scope quick filters

The source SHALL supply quick-filter tabs (assigned to me as the default,
pool, watched, everything, overdue). Switching tabs SHALL reload the source
with the tab's filter merged over the page's `sourceConfig`, tab winning on
a colliding key. A manifest that declares `config.quickFilters` SHALL win
over the source's tabs. Mounting SHALL issue exactly one request, carrying
the default tab's filter.

#### Scenario: The pool tab asks the server for pooled tasks

- **GIVEN** the tasks index with its default tabs
- **WHEN** the pool tab is selected
- **THEN** the source reloads with `scope=pooled`
- **AND** no client-side filtering of the previous page occurs
- @e2e switching to the pool tab lists the pooled task

#### Scenario: Mounting loads once

- **GIVEN** the tasks index with its default tabs
- **WHEN** the page mounts
- **THEN** exactly one request is issued
- **AND** it carries the default tab's scope
- @e2e exclude covered by unit tests counting the store's load calls

### Requirement: A row opens the task's deep link and Add is absent

A row click SHALL navigate to the task's deep link,
`/apps/openregister/flow-tasks/{uuid}`, as a full URL (the page lives in
openregister, not in the consuming app's router), and SHALL still emit
`row-click`. The source SHALL declare `showAdd: false` and the page SHALL
render no Add button for it: a task is created by a flow, never by a person
clicking Add.

#### Scenario: A click leaves for openregister

- **GIVEN** a rendered task row with uuid `t-1`
- **WHEN** the row is clicked
- **THEN** the browser navigates to `/apps/openregister/flow-tasks/t-1`
- @e2e exclude a cross-app navigation cannot be asserted in the offline harness; covered by unit tests over openRow

#### Scenario: No Add button

- **GIVEN** the tasks index page
- **WHEN** the actions bar renders
- **THEN** no Add button is shown
- @e2e the tasks index shows no Add button

### Requirement: The renderer hands page config to the source loader

For a `type: "index"` page with `config.entitySource` and no explicit
`config.sourceConfig`, `CnPageRenderer` SHALL pass the resolved config as
the `sourceConfig` prop, so loader keys (`app` for flows; `scope`, `state`,
`priority`, `overdue`, `sort`, `limit` for tasks) work declaratively. An
explicit `config.sourceConfig` SHALL win unchanged.

#### Scenario: config.scope reaches the loader

- **GIVEN** a manifest page with `entitySource: 'tasks'` and `scope: 'pooled'`
- **WHEN** the renderer resolves the page props
- **THEN** `sourceConfig` carries `scope: 'pooled'`
- @e2e exclude covered by unit tests over resolvedProps

### Requirement: A tasks widget shows the viewer's open tasks honestly

The registry SHALL offer a `tasks` widget rendering the viewer's open tasks
(`isTerminal=false`, scope from `content.scope`, default `assigned`, sorted
by due date). It SHALL state the count from the server `total`, cap rendered
rows at `content.limit`, and state the remainder from the total. Loading,
a failed read and an empty inbox SHALL be three distinct renderings, and
the failed line SHALL NOT leak the request's status text. Due and overdue
SHALL be carried by wording and shape, never colour alone.

#### Scenario: The count is the total, not the page

- **GIVEN** a payload of 3 rows with `total: 12` and `limit: 3`
- **WHEN** the widget renders
- **THEN** the count line says 12 open tasks
- **AND** the remainder line says 9 more
- @e2e the widget states the mocked total above its rows

#### Scenario: Empty is not an error

- **GIVEN** a payload of zero rows and total zero
- **WHEN** the widget renders
- **THEN** the quiet no-tasks line shows and the error line does not
- @e2e exclude covered by unit tests over the two states

#### Scenario: A failed read says so quietly

- **GIVEN** a read that fails with a 500
- **WHEN** the widget renders
- **THEN** one failed-to-load line shows, without the raw status text
- @e2e exclude covered by unit tests over the error state

### Requirement: The widget polls and pauses like the flow-runs widget

The widget SHALL refetch on `content.pollSeconds` (default 30, floored at 5,
`0` disables), pause while the tab is hidden, refetch once on return, and
clear its timer on unmount.

#### Scenario: Hidden tabs stop polling

- **GIVEN** a widget polling every 10 seconds
- **WHEN** the tab hides
- **THEN** no further refetches occur until it returns
- @e2e exclude covered by unit tests over the fake timers

### Requirement: Quick actions offer what the contract allows and surface refusals

A pooled row (no assignee, not terminal) SHALL offer claim. The viewer's own
open row SHALL offer complete, one entry per outcome when the row declares
an `outcomes` list, else a single complete with the server's default
outcome. After a verb the widget SHALL refetch. A refused verb (403, 404,
409, 400) SHALL surface the server's `error` message as a toast, never
silently, falling back to a generic line when the response carries none.

#### Scenario: Claim on a pooled task

- **GIVEN** a pooled row in the widget
- **WHEN** the claim action is clicked
- **THEN** `POST /api/flow-tasks/{uuid}/claim` is sent and the list refetches
- @e2e claiming the pooled task posts the claim and refreshes the list

#### Scenario: A lost race is told in the server's words

- **GIVEN** a claim the server refuses with 409 and an error message
- **WHEN** the refusal returns
- **THEN** a toast shows that message
- **AND** the widget refetches
- @e2e the refused claim surfaces the server's message

#### Scenario: A watcher sees no verbs

- **GIVEN** a row assigned to someone else
- **WHEN** the row renders
- **THEN** neither claim nor complete is offered
- @e2e exclude covered by unit tests over the per-row visibility

### Requirement: The widget is placeable from a manifest and configurable

The widget SHALL register under the type key `tasks` with a form covering
`scope`, `limit`, `pollSeconds`, `rowRoute` and `emptyText`, every field
defaulting to a working value. On a detail surface it SHALL render with card
chrome (content-only type). A configured `rowRoute` SHALL open that route
with the task uuid as `id`; without one, a row click opens the deep link.

#### Scenario: The form round-trips its content

- **GIVEN** the form editing a placement
- **WHEN** a field changes
- **THEN** the emitted content carries scope, limit, pollSeconds, rowRoute and emptyText
- @e2e exclude covered by unit tests over the emitted content

#### Scenario: The manifest enum accepts tasks

- **GIVEN** a v2 manifest declaring `entitySource: "tasks"`
- **WHEN** it is validated
- **THEN** validation passes
- @e2e exclude covered by the schema unit tests
