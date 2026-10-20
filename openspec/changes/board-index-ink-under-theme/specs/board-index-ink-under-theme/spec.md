# board-index-ink-under-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-ink-under-theme](../../)

## Purpose

Board index controls keep the ink the boards draw them in when a theme forces the body ink onto spans.

## ADDED Requirements

### Requirement: Board index controls keep their ink under a theme

In the board look the Save view button and an active filter chip SHALL set `--nldesign-color-on-surface` to the light
primary ink, and an idle quick-filter or saved-view count SHALL set it to the soft text ink, so a theme that colours
every span from that property draws each label in the control's own ink.

#### Scenario: DqZaken "Weergave opslaan"

- **GIVEN** the cases index in the board look under the thematiq theme
- **THEN** the "Weergave opslaan" label is in the light primary ink, not the body ink

#### Scenario: DqWooVerzoeken "Zaaktype: Woo-verzoek"

- **GIVEN** an index page with an active filter chip under the thematiq theme
- **THEN** the chip label is in the light primary ink
