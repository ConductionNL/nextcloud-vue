---
kind: code
---

# Proposal: tasks-tab-flow-task-source

## Summary

`CnTasksTab` gets a second source, `flow-tasks`. With it the tab lists the
OpenRegister flow tasks anchored on the record, creates a task on the record
with an assignee and a due date, and offers on each row only the verbs the
user can run. The record's tasks then live in the fleet's one task store and
show up in the assignee's inbox, instead of in the Nextcloud Tasks app with
no real assignee.

## Why

openregister row `rec-tasks`, "Attach tasks with a due date and an assignee
to a record", rated partial. OpenRegister's change `record-tasks-tab`
(openregister PR #4452, design D-1) asks for exactly this: "`CnTasksTab`
gains `source: "flow-tasks"`, which lists `GET /api/flow-tasks?objectUuid={id}`,
creates with `POST /api/flow-tasks` carrying the anchor, and runs the
lifecycle verbs. OpenRegister passes `source="flow-tasks"`. No local tab is
built."

What is there (openregister development, 7 October 2026): the task store
with `assignee`, `candidateGroups`, `dueAt` and the anchor `objectUuid`,
`registerId`, `schemaId`; `GET /api/flow-tasks?objectUuid=`; `POST
/api/flow-tasks`, refused with the object's own 404 when the creator may not
read it; the verbs claim, unclaim, reassign, complete, cancel. In
nextcloud-vue, `cn-tasks-entity-source` built `useTaskInboxStore`, which
already forwards `objectUuid` (`src/composables/useTaskInboxStore.js:44`).

## What changes

- `CnTasksTab` prop `source`: `vtodo` (default, today's behaviour) or
  `flow-tasks`.
- With `flow-tasks`: list through `useTaskInboxStore` with `objectUuid`,
  open tasks first by due date, finished ones folded under "Done"; overdue
  dates marked.
- A create form: title, assignee (a user, or a group as a pool), optional due
  date and description, posting the record as anchor.
- Per row, the verbs the user can run, derived from the task's state,
  assignee and requester; a refused verb shows the server's message on the
  row and leaves it unchanged.
- The tab emits `count` with the number of open tasks, for its tab badge.

## Rows unblocked

- openregister `rec-tasks` (the nextcloud-vue half).
- Leaf apps' case pages place the same tab through their manifest.

## Affected projects

- `nextcloud-vue`: `CnTasksTab`, `useTaskInboxStore` (create and verb
  helpers if absent), `CnObjectSidebar` passthrough.

## Backward compatibility

Additive. `source` defaults to `vtodo`; nothing changes for current users.

## Theming

Existing `CnTasksTab` styles; overdue in `--color-error-text`.
