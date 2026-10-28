# store-page: delta for store-page-board-shell

## ADDED Requirements

### Requirement: The board-look store page shows lenses and a side column

Under the board look the store page MUST offer lens chips with counts for all items, installed items, items with an update, and each kind the app names in `kindLenses`. It MUST also show a side column listing the installed items with their versions, the last registry check with the number of waiting updates and a Check now action, and the items that ship with the app.

#### Scenario: the store with two updates

- GIVEN a registry with nine items, five installed, two with an update and three of kind connector
- WHEN the board-look store page opens
- THEN the chips read All 9, Installed 5, Updates available 2, Connectors 3
- AND the side column lists the five installed items, two with an Update pill
- AND Check now asks the registry again
