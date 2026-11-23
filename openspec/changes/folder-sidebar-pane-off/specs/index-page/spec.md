# index-page Delta: folder-sidebar-pane-off

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [folder-sidebar-pane-off](../../)

## Purpose

Apply a folder scope's look to a list narrowed by a deep link, without drawing the folder pane.

## ADDED Requirements

### Requirement: A folder scope without a pane

With `folderSidebar.pane: false` CnIndexPage SHALL NOT draw the folder pane, and SHALL still select the folder named by the deep-link filter on `filterField` and apply that folder's scope (title, count line, add label, columns and the other scope keys). Without the key the pane SHALL render as before.

#### Scenario: Klachten from the Cases list

- **GIVEN** a Cases index with `folderSidebar: { source: "register", filterField: "caseType", pane: false }` opened at `/cases?caseType=<klacht>`
- **WHEN** it renders
- **THEN** no folder pane shows, and the list carries the title "Klachten" and the count line of the Klachten case type
