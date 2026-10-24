# settings-board-look Delta: admin-shell-formatters

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-formatters](../../)

## Purpose

A table column on an admin page formats its cells the way it does inside an app.

## ADDED Requirements

### Requirement: The admin shell provides the cell formatters

`CnAdminSettingsShell` SHALL provide `cnFormatters` to everything inside it: the built-in formatters, overridden by an ancestor's `cnFormatters` when one is provided, overridden by the shell's `formatters` prop. A formatter id a column names SHALL then resolve on an admin page that no `CnAppRoot` wraps.

#### Scenario: A relative date on an admin page

- GIVEN an admin page with a table column `formatter: "relativeDate"` and no `CnAppRoot`
- WHEN the shell renders the column
- THEN the cell resolves `relativeDate` from the shell's `cnFormatters`, not the raw ISO value

#### Scenario: The app's own formatter

- GIVEN `formatters: { caseTypeTitles: fn }` on the shell
- THEN `cnFormatters.caseTypeTitles` is that function, and the built-ins stay available
