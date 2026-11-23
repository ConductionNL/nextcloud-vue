# sidebar-toggle-clears-page-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sidebar-toggle-clears-page-header](../../)

## Purpose

The closed sidebar's open toggle never covers a page header button.

## ADDED Requirements

### Requirement: The page header leaves room for the closed sidebar's toggle

In the Nextcloud look, `.cn-page-header`, `.cn-detail-page__header` and `.cn-dashboard-page__header` SHALL pad their
end by `var(--app-sidebar-offset, 0px)`. NcAppSidebar's `.app-sidebar__toggle` SHALL be `--default-clickable-area`
square with no padding. The board look SHALL be unchanged.

#### Scenario: A character page with the sidebar closed

- GIVEN larpinq's character page at 1440px in the Nextcloud look with the object sidebar closed
- WHEN the page renders its header actions and the sidebar's open toggle
- THEN the "Acties" button ends left of the toggle, and a click on it opens its menu
