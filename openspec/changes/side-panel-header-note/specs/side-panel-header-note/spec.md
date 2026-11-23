# side-panel-header-note Delta: side-panel-header-note

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [side-panel-header-note](../../)

## Purpose

A card beside an index list shows the note its widget reports, as a dashboard card does.

## ADDED Requirements

### Requirement: A side panel card shows the note its widget reports

When a widget in an index page's `statRow`, `sidePanel` or after-list widgets emits `header` with a `note`, the card
SHALL draw that note in its header. A widget that reports no note SHALL draw none.

#### Scenario: Board DqTeamwachtrij

- **GIVEN** a record list with `headerNote` "{count:present=true} van {total} aanwezig" over five people, four present
- **THEN** the "Team vandaag" card header reads "4 van 5 aanwezig"
