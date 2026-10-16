# store-page Delta: screens-store-page-pq-board

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-store-page-pq-board](../../)

## Purpose

Under the board look the store page draws board PqStore, the one design every app's store page shares.

## ADDED Requirements

### Requirement: The store page draws board PqStore

Under the board look a store page SHALL draw chips for All, Installed, Updates available and each kind chip that has a
loaded card (`kindChips`, else one per offered kind), each with its count and the active one pressed, with the search
on the same row to the right; a chip SHALL filter the loaded cards without a new registry request. Cards SHALL sit three
a row (two, then one, as the column narrows), each with a state pill (Installed, Update or Available), a version line
that names the newer version of an update, and one action: Open, Install or Update. Beside the cards a side column of
at most 300px SHALL list the installed items with their versions, an Updates card (when the registry last answered, the
number of updates ready followed by `updatesNote`, and "Check now", which asks the registry again), and, when the app
ships items, what ships with it. Publish SHALL be the primary header button, after the buildiq square. A `footnote`
SHALL be drawn under the page. Every library string SHALL come from the library catalogue, in English and Dutch.
Without the board look the page SHALL render as before.

#### Scenario: Board PqStore

- **GIVEN** a store page under the board look with nine cards, five installed, two with an update, three adapters, and `kindChips: [{ "value": "adapter", "label": "Connectors" }]`
- **WHEN** the page renders
- **THEN** the chips read "Alle 9", "Geïnstalleerd 5", "Updates beschikbaar 2" and "Connectors 3", with the search on their right
- **AND** the side column lists the five installed items and says "2 updates staan klaar."
- **AND** choosing "Connectors" leaves the three adapters

#### Scenario: The Nextcloud look

- **GIVEN** the same page without the board look
- **WHEN** the page renders
- **THEN** it draws the search field and the kind buttons, with no chips, side column or footnote
