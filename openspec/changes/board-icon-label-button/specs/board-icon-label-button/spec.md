# board-icon-label-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-icon-label-button](../../)

## Purpose

A button with an icon and a label looks as the boards draw it, without contesting a surface's own rule.

## ADDED Requirements

### Requirement: A board button with an icon and a label is padded as the boards draw it

In the board look an NcButton with an icon and a label SHALL be 14px in at both sides, with 14px text and a 16px icon
8px from its label. A surface rule (the page header, the toolbar, the follow pill, the Meer menu, the tab strip) SHALL
keep its own values. Without the board look the button SHALL keep Nextcloud's.

#### Scenario: DqVthInstellingen "Regel toevoegen"

- **GIVEN** the admin VTH settings in the board look
- **THEN** "Regel toevoegen" is 14px in at both sides with a 16px icon 8px from its 14px label

#### Scenario: DqZaak "Acties"

- **GIVEN** a case detail page in the board look
- **THEN** the tab strip's "Acties" is 12px in at both sides

#### Scenario: The follow pill keeps its own rule

- **GIVEN** a case detail page in the board look
- **THEN** "Volgen" keeps its 10px sides and its 14px icon 6px from the label
