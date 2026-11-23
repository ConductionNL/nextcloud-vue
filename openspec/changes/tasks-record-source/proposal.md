# Proposal: tasks-record-source

## Why

dossiq's task page (`/tasks/:id`, DqTaak) is a custom view of about 1,000 lines because a `type: "detail"` page could
not read an engine task: CnDetailPage reads a register/schema object, or a record from a named source that can read
one record, and only `organisations` could. Moving the task page onto a manifest detail page with library components
starts with the `tasks` source reading one task.

## What changes

The `tasks` index source is a record source too: `loadRecord(uuid)` reads `GET /api/flow-tasks/{uuid}` into the task
inbox store's `records`, `record(uuid)` returns it with the same display fields a list row has (`id`, `title`, the
state, priority and due labels), and `recordError(uuid)` keeps the status of a refused or missing read. The engine
decides what the caller may read.
