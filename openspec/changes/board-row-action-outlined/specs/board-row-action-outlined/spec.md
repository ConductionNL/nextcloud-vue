# board-row-action-outlined Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A dashboard row's action is an outlined button

In the board look, on a dashboard page, a record-list row's `rowAction` with `variant: "outlined"` SHALL be an outlined
button (1px control border, 8px radius, main background, main ink) sized to its label, and the row's title link SHALL be
in the main ink. A `rowAction` without the variant SHALL keep its 150px by 34px pill (DcMijnActies).

#### Scenario: DqMijnTeam Wachtrij van uw team

- **GIVEN** a team queue row with the "Oppakken" row action, `variant: "outlined"`
- **THEN** the button is white with the grey control border and 8px corners, about 91px wide
- **AND** the case title reads in the main ink, not the link blue

#### Scenario: DcMijnActies keeps the pill

- **GIVEN** a work list row whose row action has no variant
- **THEN** the action is the 150px by 34px pill at the end of the row
