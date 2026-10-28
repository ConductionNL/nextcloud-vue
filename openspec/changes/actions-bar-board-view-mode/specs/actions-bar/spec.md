# actions-bar Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [actions-bar-board-view-mode](../../)

## ADDED Requirements

### Requirement: A page can offer the board view in place

CnActionsBar SHALL accept `board` in `viewMode` and `availableViewModes`. Under the board look the Bord segment SHALL then be a button, pressed while `viewMode` is `board`, that emits `view-mode-change` like the other segments.

#### Scenario: PqPipeline

- **GIVEN** `availableViewModes: ["table", "board"]`, `disabledViewModes: ["cards", "map"]` and `viewMode: "board"`
- **THEN** the switch reads Tabel, Kaarten, Bord, Map with Bord pressed, and Tabel switches the page to its list
