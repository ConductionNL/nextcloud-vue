# record-source-verbs Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-source-verbs](../../)

## Purpose

A detail page on a record source offers the verbs that source can run on the record in view.

## ADDED Requirements

### Requirement: A record source offers header verbs

A record source MAY supply `verbs(record)` and `runVerb(id, verb, options)`. CnDetailPage SHALL draw each verb the
source offers for the record in view as a header button, or as an Actions-menu entry when the verb is marked `menu`,
and SHALL draw none before the record is read or when it was not found. Running a verb SHALL post through the source,
to `config.verbEndpoints[verb]` when the manifest names one; a refusal SHALL be shown with the server's message as-is
and SHALL leave the record unchanged. The `tasks` source SHALL offer Finish, then Hand back while somebody holds the
task or Pick up while nobody does, and Cancel task in the menu, and nothing on a finished task.

#### Scenario: DqTaak

- **GIVEN** a detail page with `entitySource: "tasks"` on a task Pieter holds
- **THEN** the header shows Finish and Hand back, and Cancel task is in the Actions menu
- **WHEN** the engine refuses Finish
- **THEN** the page shows the engine's message and the task is unchanged
