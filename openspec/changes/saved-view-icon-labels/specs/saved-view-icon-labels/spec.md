# saved-view-icon-labels Delta: saved-view-icon-labels

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-icon-labels](../../)

## Purpose

Give every icon option of a saved view an accessible name in words.

## ADDED Requirements

### Requirement: An icon option is named in words

Each icon option in CnSavedViewLookFields SHALL carry an `aria-label` and a
`title` that say in the reader's language what the icon shows (the default
filter icon is "Filter", the clock "Clock"), never the icon's component name.

#### Scenario: Default icon

- **GIVEN** the save or edit view dialog
- **WHEN** the icon options render
- **THEN** the default option is named "Filter" and no option is named by its icon component
