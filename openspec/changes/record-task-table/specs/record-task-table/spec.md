# record-task-table Delta

## ADDED Requirements

### Requirement: A record's tasks show as a table with their summary and New task in the header

A `tasks` widget with `objectUuid` SHALL list every task on that record (with `includeDone`, the finished ones after the
open ones). With `variant: 'table'` it SHALL draw task, handler, deadline, status and the row's verbs (claim on a pooled
task; complete on the viewer's own task, or on any open task with `completeAny`; cancel with `cancel`), and SHALL report
its summary as the card's subtitle and, with `create`, a primary "New task" action that opens a form posting an open task
on the record. `@objectId` in its view-all link's query SHALL read the page's record.

#### Scenario: DqZaakTaken

- **GIVEN** a case with one open and three finished tasks and the table configured with `create`
- **THEN** the card reads "1 open, 3 klaar · op deadline gesorteerd" under its title, "Nieuwe taak" sits at the header's end, and the open task comes first with its Complete button
