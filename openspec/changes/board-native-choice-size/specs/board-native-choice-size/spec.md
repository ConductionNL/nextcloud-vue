# board-native-choice-size Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-native-choice-size](../../)

## Purpose

Native radios and checkboxes are as large as the boards draw them.

## ADDED Requirements

### Requirement: A native radio or checkbox is 18px in the board look

In the board look a native radio or checkbox outside NcCheckboxRadioSwitch SHALL draw 18px square with the primary
colour as its accent.

#### Scenario: DqVolgendeStap

- **GIVEN** the next-step dialog's option cards in the board look
- **THEN** each radio draws 18x18 in #3669a5

#### Scenario: the card shows through the radio
- GIVEN a checked or disabled native radio in a board choice card
- THEN its computed background is transparent, not the primary or grey ground Nextcloud and the theme paint
