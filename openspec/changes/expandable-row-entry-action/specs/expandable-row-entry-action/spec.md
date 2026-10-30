# expandable-row-entry-action Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [expandable-row-entry-action](../../)

## Purpose

An expandable row's sub-table can offer an action per entry.

## ADDED Requirements

### Requirement: An expandable row's sub-table can end every entry with an action

With `table.entryAction: { id, label, icon? }` CnExpandableRow SHALL end every sub-table entry with a 32px round icon
button, drawing `icon` (Pencil when none is named) and named "{label} {entry}", where the entry is the text of the first
plain column. Pressing it SHALL emit `action` with `{ id, row, entry }`, and CnIndexPage SHALL run the row action `id`
for the row. Without `entryAction` the sub-table SHALL draw no extra column.

#### Scenario: PqPipelines stage pencil

- **GIVEN** the pipelines list with `entryAction: { id: "edit", label: "Edit stage", icon: "Pencil" }` and the Sales pipeline open
- **THEN** every stage row ends with a pencil button, the first named "Fase bewerken Nieuw"
- **WHEN** the agent presses it
- **THEN** the pipeline's edit form opens

@e2e exclude A rendering rule and an event covered by the component test; the edit form it opens is the existing row action.
