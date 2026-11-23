# grouped-cards-widget Delta: grouped-cards-widget

## ADDED Requirements

### Requirement: A widget draws groups of cards from an endpoint

The `grouped-cards` widget SHALL read groups at `groupsPath` of its endpoint
payload and the cards of each group at `itemsKey`, draw each group as a section
named by its `groupTitle` heading with an optional `groupCount` pill, each card
with `itemTitle` and a meta line of `itemMeta` parts (an empty part left out),
and close with the dashed `extraGroup` box when its list has entries. A
language-map value SHALL read in the user's language and a list of plain values
joined with ", ".

#### Scenario: A case type's phases and tasks

- **GIVEN** an endpoint answering two phases, the first with two tasks, and two always-available acts
- **WHEN** the widget renders with `groupTitle: "Phase {order}: {name}"` and `groupCount`
- **THEN** it draws "Phase 1: …" with "2 tasks" and both task cards, "Phase 2: …" with its empty text, and the always box listing both acts on one line
