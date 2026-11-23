# record-source-verbs Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [task-edit-action](../../)

## ADDED Requirements

### Requirement: A record-source verb can ask for values first

A record-source verb with `form: { schema, item }` SHALL open a form filled with `item` instead of running. On confirm
the page SHALL send only the form schema's fields to the source; on success the form SHALL close and the page SHALL
redraw from the record the source keeps; on refusal the form SHALL show the server's message and the record SHALL stay
as it was. The `tasks` source SHALL offer Edit on an open task with its title, description, due date and priority,
saved through `PATCH /api/flow-tasks/{uuid}`.

#### Scenario: DqTaak "Bewerken"

- **GIVEN** an open task on its page
- **WHEN** the handler chooses Edit, moves the due date and saves
- **THEN** the engine receives the four fields and the page shows the new due date
