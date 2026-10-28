# store-page: delta for store-page-board-as-drawn

## ADDED Requirements

### Requirement: A board-look store card shows its state and its action as drawn

Under the board look every catalogue card MUST show a state pill under its kind line: Installed, Update, or Available for an item that is not installed. Install and Update MUST be soft pill buttons, and Open MUST be an outlined button.

#### Scenario: an item that is not installed

- GIVEN a registry item that is not installed
- WHEN the board-look store page shows its card
- THEN the pill under the kind line reads Available
- AND the footer action reads Install as a soft pill button

### Requirement: The board-look store page reads and spaces as drawn

Under the board look the first lens MUST read "Alle" in Dutch and the search MUST be a field with a magnifier and the placeholder "Zoek in de store". The header MUST follow the index page header, and the side column MUST be 260px wide, 20px from the cards.

#### Scenario: the Dutch store page

- GIVEN a Dutch user on the board-look store page
- WHEN the page opens
- THEN the first lens reads Alle with its count
- AND the search field shows the placeholder Zoek in de store
