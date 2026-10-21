# record-checklist-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-checklist-widget](../../)

## Purpose

A detail page draws a record's checklist and ticks it through the page's record source.

## ADDED Requirements

### Requirement: A checklist widget ticks items through the record source

The `checklist` widget SHALL list the items of the record in view that carry an id, with how many are done. When the
page's record source can tick items for that record, a tick SHALL be written through the source and the box SHALL
follow the record the write answers with; a refusal SHALL be shown with the server's message and leave the item as it
was. Without such a source, or on a record the source says can no longer be ticked, the list SHALL be read-only. The
`tasks` source SHALL tick through `PATCH /flow-tasks/{uuid}/checklist/{itemId}` and SHALL refuse nothing itself on an
open task; a finished task SHALL be read-only.

#### Scenario: DqTaak

- **GIVEN** a detail page with `entitySource: "tasks"` and a `checklist` widget, on an open task with four items, two ticked
- **THEN** the card says "2 of 4 done"
- **WHEN** the handler ticks the third item
- **THEN** the engine is asked to tick it and the card shows what the engine answered
