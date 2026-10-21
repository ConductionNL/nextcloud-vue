# board-index-sidebar

## ADDED Requirements

### Requirement: The board index sidebar draws the board's side panel

In the board look the sidebar of an index page SHALL be 360px wide, SHALL set its title at weight 700 on a 1.2 line
and the line under it at 14px in the muted ink, SHALL round its close button, and SHALL draw its tabs as a row of
icon-and-label tabs 40px high at 14px in the soft ink, the open one in the light primary ink over a 2px primary
underline without a tinted ground.

#### Scenario: DqFilterBeheren side panel

- **GIVEN** the Cases index page of a board-look app with the sidebar open
- **THEN** the sidebar is 360px wide
- **AND** "Zoeken", "Kolommen" and "Weergaven" sit in one row, each icon beside its label, 40px high
- **AND** the open tab carries a 2px underline in the primary colour and no tinted ground
