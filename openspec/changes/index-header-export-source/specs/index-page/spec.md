# index-page Delta: index-header-export-source

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-header-export-source](../../)

## Purpose

Never draw an Export button that does nothing.

## ADDED Requirements

### Requirement: A header export is drawn only when it can export

On an index page with an `entitySource`, a header button with `action: "export"` SHALL be drawn only when it carries `run` (the id of a `headerActions` entry) or the page has a `@mass-export` listener. With `run`, pressing it SHALL run that header action instead of the export dialog. A page listing OpenRegister objects SHALL keep its Export as before.

#### Scenario: The team queue

- **GIVEN** an index page with `entitySource: "endpoint"` and `headerButtons: [{ action: "export" }, { action: "add", variant: "primary" }]`, and no `@mass-export` listener
- **WHEN** it renders
- **THEN** only the Add button is drawn
