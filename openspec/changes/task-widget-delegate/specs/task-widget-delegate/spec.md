# task-widget-delegate Delta: task-widget-delegate

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [task-widget-delegate](../../)

## Purpose

Let a person hand their own open task to a colleague from the shared tasks
widget, with the mandate the engine requires, and show who a delegated task
is handled on behalf of.

## ADDED Requirements

### Requirement: The tasks widget offers delegation on the viewer's own open task

With `content.delegate: true`, CnTasksWidget SHALL offer "Hand to a colleague"
in the row menu of every open task assigned to the viewer, in the table and
the default variants. The action SHALL open a dialog that asks for a colleague
(a user search that leaves out the viewer) and a mandate, and SHALL keep its
submit disabled until both are given. Submitting SHALL post `delegate` (the
colleague's user id) and `mandate` (trimmed) to the engine's `delegate` verb.
A refusal SHALL stay in the dialog in the server's own words; success SHALL
close the dialog, toast the hand-over and refetch the rows. Without
`content.delegate` no row SHALL offer it, and a task of someone else or a
finished task SHALL never offer it.

#### Scenario: An approver hands a step to a colleague

- **GIVEN** a tasks widget with `delegate: true` and an open approval step assigned to the viewer
- **WHEN** the viewer chooses "Hand to a colleague", picks Karin de Wit and writes the mandate "Absence of the team lead, mandate 2026-07"
- **THEN** the widget posts `{ delegate: "karin", mandate: "Absence of the team lead, mandate 2026-07" }` to `/apps/openregister/api/flow-tasks/{uuid}/delegate`
- **AND** the rows are read again

#### Scenario: An empty mandate is not sent

- **GIVEN** the delegate dialog with a colleague chosen and a blank mandate
- **THEN** the hand-over button is disabled and nothing is posted

### Requirement: A delegated task names who it is handled for

In the table variant, a task carrying `onBehalfOf` SHALL show "on behalf of
<display name>" under its handler.

#### Scenario: The decided step shows the original approver

- **GIVEN** a task with `assignee: "karin"` and `onBehalfOf: "jan"`
- **WHEN** the table renders
- **THEN** the handler cell shows Karin and "on behalf of" Jan's display name
