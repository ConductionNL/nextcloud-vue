# board-notice-ink Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-notice-ink](../../)

## Purpose

The side notice reads in its own ink, as the boards draw it.

## ADDED Requirements

### Requirement: The side notice text and icon take the notice ink

In the board look the text and icon of the banner in a detail page's side notice SHALL use `--cn-board-notice-ink`,
which defaults to `--color-warning-text`. The icon SHALL be 18px, with 2px above it and 10px between it and the text.
The Nextcloud look SHALL be unchanged.

#### Scenario: A case page with an open advice request

- GIVEN a case page in the board look with the "Advies gevraagd" notice
- WHEN the side column renders
- THEN the notice text and icon are in the notice ink
- AND the icon is 18px, 10px before the text
