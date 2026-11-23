# Proposal: task-edit-action

## Why

DqTaak draws "Bewerken" on a task. The task engine now takes `PATCH /api/flow-tasks/{uuid}` for a task's title,
description, due date and priority (openregister flow-task-edit), and the task page had no way to ask for values before
running a verb.

## What changes

- A record-source verb may carry `form: { schema, item, fieldOverrides? }`. CnDetailPage opens that form instead of
  running the verb, sends only the form's fields to the source, and redraws from the record the source keeps. A refusal
  is shown in the form, which stays open.
- The `tasks` source offers Edit on an open task with the four fields; the store saves it through the engine's PATCH.

## Scope

Additive. The verb list of an open task gains Edit as a header button.
