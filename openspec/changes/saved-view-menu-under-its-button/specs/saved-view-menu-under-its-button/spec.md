# saved-view-menu-under-its-button Delta: saved-view-menu-under-its-button

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-menu-under-its-button](../../)

## Purpose

Open a saved view's manage menu where the boards draw it.

## ADDED Requirements

### Requirement: A saved view's manage menu opens under the end of its button

The manage menu of a saved-view row SHALL open below its button, aligned to
the button's end, so it stays inside the side panel. In the board look it
SHALL sit 7px higher, over the button's lower edge.

#### Scenario: Menu in the side panel

- **GIVEN** the saved-views panel in the side panel
- **WHEN** a row's manage button is pressed
- **THEN** the menu opens below the button with its end at the button's end
