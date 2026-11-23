# index-page Delta: index-scope-views

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-scope-views](../../)

## Purpose

Keep the generic look in views a scope's look is not made for.

## ADDED Requirements

### Requirement: A scope look can be limited to view modes

With `folderSidebar.scopeViews` (a non-empty list of view modes), CnIndexPage SHALL apply the active scope's layout and presentation only while the current view mode is listed; in any other view it SHALL show the page's own columns, title and other presentation keys, and the scope SHALL still filter the rows. Without the key the scope's look SHALL apply in every view.

#### Scenario: The werkbord

- **GIVEN** a cases page with `folderSidebar.scopeViews: ["table", "list"]` opened at `?caseType=<klacht>`
- **WHEN** the reader switches to the board view
- **THEN** the board shows the page's own title and columns, filtered to Klachten
