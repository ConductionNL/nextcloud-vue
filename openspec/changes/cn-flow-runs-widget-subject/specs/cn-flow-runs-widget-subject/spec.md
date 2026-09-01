## Purpose

The case detail page's view of the flow engine, through the shared widget:
one subject object's live runs, that subject's finished runs, and a deep link
into a run. Consumes the two reads and the row contract of the openregister
change `flow-runs-subject-scope`.

## ADDED Requirements

### Requirement: A subject option scopes the widget to one object

The widget SHALL accept a `content.subject` option holding a subject object
uuid or an object-context token (`@objectId`, `@object.<field>`). When set,
the live-runs request SHALL carry it as the `subject` parameter, and the
widget SHALL additionally request the subject's completed runs from the
completed-runs read with the same `subject` and the same row limit.

When no subject is configured the widget SHALL issue exactly the request it
issues today, with no `subject` parameter and no completed-runs request.

Filtering SHALL NOT be performed client-side: the widget forwards the subject
and renders what the server returns.

#### Scenario: A case placement asks for its own runs

- **GIVEN** a placement with `subject` set to a case uuid
- **WHEN** the widget builds its requests
- **THEN** the active request carries `subject` equal to that uuid
- **AND** a completed-runs request is built with the same `subject`
- @e2e the case detail widget lists only the case's own runs

#### Scenario: No subject means today's widget

- **GIVEN** a placement without `subject`
- **WHEN** the widget builds its requests
- **THEN** the active request carries no `subject`
- **AND** no completed-runs request is built
- @e2e exclude regression covered by the existing CnFlowRunsWidget unit tests

### Requirement: The subject binds the current object through the detail context

The widget SHALL resolve an object-context token in `content.subject` against
the detail surface's injected object context (`cnObjectContext`,
`cnDetailObjectContext`), through the library's shared token grammar, so a
case detail manifest can author `subject: '@objectId'` without hardcoding a
uuid.

While the token cannot resolve, the widget SHALL NOT send the request and
SHALL render its loading state rather than an empty line: a claim about a
case's runs requires knowing which case.

#### Scenario: @objectId resolves to the page's object

- **GIVEN** a detail page providing an object context with id X
- **AND** a placement with `subject: '@objectId'`
- **WHEN** the widget mounts
- **THEN** the token context handed to both reads carries object id X
- **AND** the widget's resolved subject is X
- @e2e exclude covered by unit tests over the injected context

#### Scenario: An unresolved token waits

- **GIVEN** a placement with `subject: '@objectId'` and no object context
- **WHEN** the widget mounts
- **THEN** the loading state is shown
- **AND** no empty line is shown
- @e2e exclude covered by unit tests; a dashboard without object context is a misplacement, not a flow

### Requirement: Finished runs render as history, visibly distinct

In subject mode the widget SHALL render the subject's completed runs below
the live rows under their own label. A terminal row (`completed`, `stopped`,
`failed`, `dead_letter`) SHALL be distinguishable from a live row by shape
and text, never by colour alone: a hollow status dot, a muted name, the
section label, and the status word in the meta line.

The history SHALL state how many further finished runs exist, from the
completed read's total, not from the rendered length. A failed history read
SHALL render one quiet line without the request's status text and SHALL NOT
remove the live rows.

#### Scenario: A finished flow appears in the case's history

- **GIVEN** a subject with one live run and one completed run
- **WHEN** the widget renders
- **THEN** the completed run is in the history section marked terminal
- **AND** the live run is not in the history section
- @e2e a finished flow appears in the case detail's run history

#### Scenario: A failed run reads as failed

- **GIVEN** a subject whose history holds a run with status `failed`
- **WHEN** the widget renders
- **THEN** that row's meta line names the failure
- @e2e exclude covered by unit tests over the status labels

#### Scenario: History states its remainder honestly

- **GIVEN** a completed read reporting a total larger than the row limit
- **WHEN** the widget renders
- **THEN** the history rows are capped to the limit
- **AND** the count of remaining finished runs is shown
- @e2e exclude covered by unit tests over the completed total

### Requirement: Nothing ever ran is a different line from nothing running now

In subject mode, when both reads have settled empty without error, the
widget SHALL render one line stating that no flows have run for this
subject. When the history has rows and the live list is empty, the widget
SHALL render the nothing-running line above the history. The two lines SHALL
differ in wording.

Without a subject the widget SHALL keep its single nothing-running line.

#### Scenario: A case where nothing ever ran says so

- **GIVEN** a subject with no live and no completed runs
- **WHEN** the widget renders
- **THEN** the "no flows have run yet" line is shown
- @e2e exclude covered by unit tests over both empty payloads

#### Scenario: A quiet case still shows its history

- **GIVEN** a subject with no live runs and one completed run
- **WHEN** the widget renders
- **THEN** the nothing-running line is shown
- **AND** the history section is shown
- @e2e exclude covered by unit tests over the mixed payload

### Requirement: A row opens the run when a run route is configured

The widget SHALL accept a `content.runRoute` option. When configured and the
clicked row carries a run uuid, the click SHALL navigate to that route with
the run uuid as the `id` parameter, for live and history rows alike.

When `runRoute` is absent, or the row carries no run uuid, the click SHALL
behave exactly as before: `rowRoute` with the flow id, or nothing when no
route is configured.

#### Scenario: A click opens the run

- **GIVEN** a placement with `runRoute` and a row with a run uuid
- **WHEN** the row is clicked
- **THEN** the run route is opened with the run uuid as `id`
- @e2e exclude covered by unit tests over the router push

#### Scenario: A row without a uuid falls back to the flow

- **GIVEN** a placement with `runRoute` and `rowRoute` and a row without a uuid
- **WHEN** the row is clicked
- **THEN** the row route is opened with the flow id
- @e2e exclude covered by unit tests over the router push

### Requirement: Polling refreshes the history too

While a subject is configured, every poll tick and every return from a
hidden tab SHALL refetch both reads, so a run that finishes between polls
moves to the history instead of disappearing. Without a subject only the
live read SHALL be refetched. The interval rules, the five-second floor, the
`0` opt-out and the hidden-tab pause SHALL be unchanged.

#### Scenario: A tick refreshes both reads

- **GIVEN** a subject placement with polling on
- **WHEN** the interval elapses
- **THEN** both the live and the completed read are refetched
- @e2e exclude covered by unit tests over the fake timer

### Requirement: The form exposes the new options with safe defaults

`CnFlowRunsWidgetForm` SHALL offer `subject` and `runRoute` fields, both
defaulting to empty, and the registry's default content SHALL carry both keys
as empty strings so a placement without them is today's widget.

#### Scenario: The form round-trips the new keys

- **GIVEN** a placement edited with a subject and a run route
- **WHEN** a field changes
- **THEN** the emitted content carries `subject` and `runRoute`
- @e2e exclude covered by unit tests over the emitted content
