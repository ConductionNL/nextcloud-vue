# tabs Delta: screens-segmented-tabs-wrap

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-segmented-tabs-wrap](../../)

## Purpose

No tab strip scrolls sideways under the board look.

## ADDED Requirements

### Requirement: A segmented tab strip wraps under the board look

Under the board look a segmented tab strip that does not fit its container SHALL wrap its tabs onto more rows and
SHALL NOT scroll sideways.

#### Scenario: Thirteen tabs in a narrow card

- **GIVEN** a tabs widget with `variant: "segmented"` and 13 tabs in a 686px card under the board look
- **WHEN** it renders
- **THEN** the tabs take more than one row, the strip does not scroll and no tab extends past the card
