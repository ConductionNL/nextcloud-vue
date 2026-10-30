# board-settings-list-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A list an app draws on a settings card is flat

In the board look a list marked `cn-settings-list` on a settings card SHALL stack its rows without a gap, and a row
marked `cn-settings-row` SHALL draw no box of its own: no edge, no radius, no fill, 10px padding top and bottom, none at
the sides, and a hairline below. The Nextcloud look SHALL keep the app's own row style.

#### Scenario: pipelinq's skills and agent profiles

- **GIVEN** the Vaardigheden and Medewerkerprofielen cards on pipelinq's admin settings in the board look
- **THEN** each row's text starts at the same inset as the card's title
- **AND** the rows are divided by a hairline, not drawn as separate boxes
