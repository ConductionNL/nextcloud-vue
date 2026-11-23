# saved-views Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-chips-switch](../../)

## Purpose

An index page can show its saved views in the side panel only, as the boards do.

## ADDED Requirements

### Requirement: An index page can leave the saved-view chips out of the toolbar

With `config.savedViewChips: false` an index page in the board look SHALL draw no saved-view chips in the toolbar and
SHALL keep the Save view button. Without the key the chips SHALL draw as before.

#### Scenario: DqZaken

- **GIVEN** dossiq's case list with `savedViewChips: false` and several saved views
- **THEN** the toolbar shows "Weergave opslaan" and no view chips, and the views are listed in the side panel
