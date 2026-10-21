# dashboard-widget-header-actions Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-widget-header-actions](../../)

## ADDED Requirements

### Requirement: A dashboard card draws its widget's header actions

On a dashboard, a widget definition's `headerActions` SHALL be drawn in that widget's card title row, translated, and a
click SHALL dispatch the entry's action through the action dispatcher. A widget without `headerActions` SHALL draw none.

#### Scenario: Catalogue object types

- **GIVEN** the object types card declares "Add object type"
- **THEN** the card's title row shows the button, and pressing it runs its action
