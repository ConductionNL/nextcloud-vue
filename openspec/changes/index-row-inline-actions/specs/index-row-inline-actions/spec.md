# index-row-inline-actions Delta

## ADDED Requirements

### Requirement: A row can show its first actions as buttons

An index page MAY declare `rowInlineActions`, a number. Each row SHALL then show that many of its visible actions as
buttons beside its menu, the first as a tonal pill and an `iconOnly` action as its icon named by its label, and SHALL
leave the menu out when no action is left for it.

#### Scenario: Board PqWachtrij

- **WHEN** the queue declares `rowInlineActions: 2` with the actions Take it on and View (`iconOnly`)
- **THEN** each row shows "In behandeling nemen" as a pill and an eye named "Bekijken"
- **AND** no three-dot menu
