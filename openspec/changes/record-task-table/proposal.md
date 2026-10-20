# Proposal: record-task-table

## Why

Board DqZaakTaken draws a case's tasks as a table: task, handler, deadline, status and the row's action, the open tasks
first and the finished ones struck through, with "1 open, 3 klaar · op deadline gesorteerd" under the card title and
"Nieuwe taak" at the card header's end. dossiq drew it with its own CaseTaskPane, which put the summary and the button in
the body, because the library had no record-scoped task table.

## What changes

CnTasksWidget (type `tasks`) gains `objectUuid` (a record's tasks, `"@objectId"` for the page's record, every assignee),
`includeDone`, `variant: 'table'`, `create` (an inline title and deadline form posting an open task on the record),
`completeAny` and `cancel`. The table reports its summary as the card header's subtitle and "New task" as a primary
header action. CnDetailWidgetHost passes a widget-reported `subtitle` to the card, and CnDetailWidgetHeaderItems draws an
action with `variant: 'primary'` as a filled button. Claim, complete (with outcomes), cancel, adding a task and opening
a task (row route) stay available.
