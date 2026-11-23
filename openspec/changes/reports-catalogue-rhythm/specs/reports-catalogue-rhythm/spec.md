# reports-catalogue-rhythm Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [reports-catalogue-rhythm](../../)

## Purpose

The reports catalogue reads as board PqReports draws it.

## ADDED Requirements

### Requirement: The reports catalogue sets its text as the board does

In the board look the reports catalogue SHALL set its page description, section titles, card categories, aside titles
and category rows at the font's normal line height. The category rows and each card's Open link SHALL read in the main
text colour, also under a theme that forces links into its link colour. The Nextcloud look SHALL be unchanged.

#### Scenario: PqReports in the board look

- GIVEN the reports page as a catalogue in the board look under the NL Design theme
- THEN the aside title "Categorieën" is 17px at the normal line height (20.4px)
- AND each category row is 34px high and reads in the main text colour
- AND each card's "Open" reads in the main text colour
