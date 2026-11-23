# notification-matrix Delta: notification-matrix-nc-checkbox

## ADDED Requirements

### Requirement: The board matrix draws Nextcloud's checkbox

In the board look a matrix cell's checkbox SHALL be drawn as Nextcloud's 20px checkbox icon, in the primary colour when checked and the max-contrast tone when not, with a visible focus outline.

#### Scenario: Meldingen
- THEN a checked cell shows the checkbox-marked icon in the primary colour

#### Scenario: The board look's native checkbox ground does not hide it
- GIVEN the board look grounds a native checkbox transparent at 18px
- THEN a matrix cell's checkbox keeps its own 20px icon in its own colour, checked or not
