# board-dashboard-card-subtitle-gap Delta

## ADDED Requirements

### Requirement: A board dashboard card's content starts 12px under its subtitle

In the board look, a bordered dashboard card whose header holds a subtitle SHALL pad its header 12px below, without
taking off the first line's leading. A card over a list that rules above its first row SHALL keep its 6px.

#### Scenario: DqCatalogus Objecttypen

- **GIVEN** the dashboard card "Objecttypen" with the subtitle "Objecten die u aan zaken koppelt; eigenschappen beheert u hier" over a table
- **WHEN** it is drawn in the board look
- **THEN** the table starts 12px under the subtitle
