# index-sidebar Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sidebar-close-label-board](../../)

## Purpose

The close button reads as the board names it.

## ADDED Requirements

### Requirement: The board look names the close button "Close side panel"

On the board look the index sidebar's close button SHALL be labelled and titled "Close side panel" (nl "Zijpaneel
sluiten"). On the Nextcloud look it SHALL keep NcAppSidebar's own label.

#### Scenario: The cases sidebar

- **GIVEN** the cases list on the board look with the sidebar open
- **THEN** a screen reader reads its close button as "Zijpaneel sluiten"
