## ADDED Requirements

### Requirement: A board reports page can be one panel of report cards
Under the board look a reports page with `config.panel` SHALL draw its cards in one titled panel, each with its description, grouping line, pill and link where declared. A card whose `requiresApp` is not installed SHALL say so in its `missingText` and SHALL NOT link.

#### Scenario: The panel lists the reports
- GIVEN a reports page with `config.panel` in the board look
- WHEN the page opens
- THEN the cards stand in one panel under its title, with the panel link beside the title

#### Scenario: The app of a card is missing
- GIVEN a card with `requiresApp` naming an app that is not installed
- WHEN the panel opens
- THEN the card shows its `missingText` and no link

#### Scenario: The default look
- GIVEN the same page without the board look
- WHEN the page opens
- THEN the cards stand in the grid as before and the card of the missing app is left out
