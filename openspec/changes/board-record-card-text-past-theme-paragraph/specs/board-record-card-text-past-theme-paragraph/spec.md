# board-record-card-text-past-theme-paragraph Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-record-card-text-past-theme-paragraph](../../)

## ADDED Requirements

### Requirement: The record card's paragraphs keep their size and ink under the theme

In the board look the record card's meta line, note and description SHALL keep their own size, weight and ink under a
theme that sets paragraphs with `!important` through its paragraph tokens.

#### Scenario: DqAanMijToegewezen

- GIVEN the thematiq theme and a covered case's card
- THEN the meta line reads 14px muted and "Voor Esra Demir, tot 30 okt" 13px semibold purple
