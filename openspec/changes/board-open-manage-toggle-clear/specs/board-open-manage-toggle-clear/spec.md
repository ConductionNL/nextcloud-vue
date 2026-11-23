## ADDED Requirements

### Requirement: An open saved view menu trigger stays clear

In the board look a saved view row's manage trigger SHALL keep no background of its own while its menu is open, so the row's tint shows through it.

#### Scenario: DqFilterBeheren
- GIVEN the saved views panel in the board look
- WHEN the reader opens "Beheer Wacht op inwoner"
- THEN the trigger reads the row's tint, rgb(234, 240, 247), not NcActions' open background
