# board-share-field-focus-edge Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-share-field-focus-edge](../../)

## REMOVED Requirements

### Requirement: The share field draws one focus ring

Superseded: a focused field draws the same 1px primary edge everywhere.

## ADDED Requirements

### Requirement: The share field keeps the field focus edge

In the board look the share field's search input SHALL keep its own 1px primary edge and the theme's focus rings while focused, and the toggle SHALL draw no ring of its own.

#### Scenario: DqFilterDelen

- GIVEN the share dialog of a saved view with "han" typed
- THEN the field reads 40 high with a 1px rgb(54, 105, 165) edge, and no 2px main-text ring around it
