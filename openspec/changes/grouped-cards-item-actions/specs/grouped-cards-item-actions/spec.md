# grouped-cards-item-actions Delta: grouped-cards-item-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [grouped-cards-item-actions](../../)

## ADDED Requirements

### Requirement: Every card can carry actions

A grouped-cards widget SHALL draw `content.itemActions` on every card, with `@item.<path>` and `@group.<path>` in
their strings read from the card and its group (URL-encoded in `url`, `target` and `href`; a string that is exactly
one token keeping the value's type), and SHALL leave out an action whose local `visibleWhen` does not hold on
`{ item, group }`. `extraItemsKey` SHALL draw a second list of each group under `extraItemsHeading`, with
`extraItemActions` as for the cards. A meta part `{ count, one, other }` SHALL read the count in the singular or plural
text; a group line `{ text, when }` SHALL show only when `when` holds on the group; `groupProgress` SHALL draw a
progress bar of the group's value.

#### Scenario: A learner joins, moves or leaves a work group

- **GIVEN** an open set in which the learner is in group A, group B has a free place and group C is full
- **WHEN** the widget renders
- **THEN** group A offers Leave, group B offers Move here and group C offers nothing

#### Scenario: A coordinator places a learner who did not sign up

- **GIVEN** a lesson with learners who did not sign up
- **WHEN** the widget renders the lesson
- **THEN** each of them is listed under "Not signed up" with Place, posting that learner to the lesson
