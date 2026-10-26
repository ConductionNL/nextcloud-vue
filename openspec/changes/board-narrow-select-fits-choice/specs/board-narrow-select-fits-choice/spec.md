# board-narrow-select-fits-choice Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-narrow-select-fits-choice](../../)

## ADDED Requirements

### Requirement: The board view's narrowing select fits the chosen value

In the board look the board view's narrowing select SHALL size to the chosen option (`field-sizing: content`) with 28px
on the right for its caret, not to its longest option. The column switch and the Nextcloud look SHALL be unchanged.

#### Scenario: DqWerkbord

- GIVEN the board view narrowed to Woo-verzoek on a catalogue with long case type names
- THEN "Zaaktype:" reads "Woo-verzoek ⌄" about 120px wide, not the width of the longest case type
