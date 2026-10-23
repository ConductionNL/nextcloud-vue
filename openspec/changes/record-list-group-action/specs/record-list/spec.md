# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-group-action](../../)

## ADDED Requirements

### Requirement: A record list's action can end a group heading, as a tonal pill

With `groupBy` and `footerAction.group` set to a group value, the record list SHALL draw the action at the end of that
group's heading row and SHALL NOT draw it under the list. The heading of that group SHALL be drawn even when no row
carries the value: after the other groups when there are rows, under the empty text when there are none. The action
keeps its `disabledWhen` and `disabledReason`. With `footerAction.variant: "tonal"` the action SHALL be drawn as a tonal
pill; without it, as the secondary button it was. Without `footerAction.group` the action SHALL stand under the list as
before.

#### Scenario: DqZaakGerelateerd with planned follow-ups

- **GIVEN** related cases grouped by `group`, rows in the `planned` group, and a tonal "Vervolg plannen" action for it
- **THEN** "Gepland vervolg" carries "Vervolg plannen" at the end of its heading, and nothing stands under the list

#### Scenario: No planned follow-ups yet

- **GIVEN** the same card with related cases but none planned, or with no rows at all
- **THEN** a "Gepland vervolg" heading with the action is drawn after the groups, or under the empty text
