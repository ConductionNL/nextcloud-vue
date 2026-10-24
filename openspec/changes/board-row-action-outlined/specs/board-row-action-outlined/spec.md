# board-row-action-outlined Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A dashboard row's action is an outlined button

In the board look, on a dashboard page, a record-list row's `rowAction` SHALL be an outlined button (1px control
border, 8px radius, main background, main ink) sized to its label, and the row's title link SHALL be in the main ink.

#### Scenario: DqMijnTeam Wachtrij van uw team

- **GIVEN** a team queue row with the "Oppakken" row action
- **THEN** the button is white with the grey control border and 8px corners, about 91px wide
- **AND** the case title reads in the main ink, not the link blue
