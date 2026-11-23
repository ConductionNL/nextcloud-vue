# chip-list-manager

## ADDED Requirements

### Requirement: An administrator keeps a word list as chips

CnChipListManager MUST list the objects of its schema as chips, in alphabetical order. It MUST add a typed word as a new object, rename a word on double-click, and delete a word only after a confirm. It MUST refuse a name the list already has, whatever the case, without a request. A rename MUST go to `renameUrl` when given.

#### Scenario: add a label

- GIVEN the labels afval, duurzaam and ondernemers
- WHEN the administrator types "parkeren" and presses Toevoegen
- THEN the card creates a label named parkeren
- AND shows it as a chip

#### Scenario: rename a label through the app

- GIVEN a card with a `renameUrl`
- WHEN the administrator double-clicks "ondernemers", types "ondernemers centrum" and presses Enter
- THEN the card posts the new name to the rename endpoint for that label

#### Scenario: a duplicate is refused

- WHEN the administrator adds "Duurzaam" while "duurzaam" is on the list
- THEN no request is sent
- AND the card says the name is already on the list
