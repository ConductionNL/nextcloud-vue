# board-dashboard-switch-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-switch-row](../../)

## Purpose

The switch row under a board dashboard's header draws the board's link pills and segmented view switch.

## ADDED Requirements

### Requirement: The link pills take the deep primary ink

In the board look a dashboard's view link pills SHALL be drawn in the light primary text mixed toward the main text,
also where a theme forces its link ink onto every link.

#### Scenario: DqMijnWerk links

- **GIVEN** a board dashboard with `viewLinks` under the Zuiddrecht set
- **THEN** "Uw wachtrij" is drawn in the deep primary ink on the light primary ground, at least 4.5:1

### Requirement: The view switch is the board's segmented control

In the board look the view switch in a dashboard's switch row SHALL set its labels at 14px, the options not chosen in
the soft ink and the chosen one in the main ink without a visible edge; in forced-colours mode the chosen one SHALL
keep an edge.

#### Scenario: DqMijnWerk view switch

- **GIVEN** a board dashboard with a My work / My team switch in its switch row
- **THEN** "Mijn werk" is a raised white segment without an edge and "Mijn team" a soft label on the track
