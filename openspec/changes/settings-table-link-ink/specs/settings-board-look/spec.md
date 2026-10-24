# settings-board-look Delta: settings-table-link-ink

## ADDED Requirements

### Requirement: A linked cell in a settings table reads in the text ink

In the board look a linked cell (`widget: "link"`) in a table inside an admin settings card SHALL use the main text colour and an underline, not the page's link colour.

#### Scenario: A connection's name
- GIVEN the Integraties tab's connections table in the board look
- THEN "Kadaster (BRK) en WOZ" reads in the text ink, underlined
