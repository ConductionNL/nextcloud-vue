# Proposal: record-checklist-widget

## Why

dossiq's task page (DqTaak) draws the task's checklist as a card, "2 of 4 done", with each item ticked in place. A
manifest detail page on `entitySource: "tasks"` has no widget that can draw a record's checklist or write a tick back
through the task engine, so the page cannot leave its custom view yet.

## What changes

A `checklist` widget draws the items a record carries (`content.path`, `checklist` by default) with a "{done} of
{total} done" line, and writes a tick through the detail page's record source. CnDetailPage provides
`cnRecordChecklist` when its source can tick items (`checkItem`, `canCheckItems`); the `tasks` source ticks through the
engine's `PATCH /flow-tasks/{uuid}/checklist/{itemId}` and takes the task the engine answers with.
