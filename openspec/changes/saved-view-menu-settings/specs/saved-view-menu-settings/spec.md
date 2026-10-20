# saved-view-menu-settings Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-menu-settings](../../)

## Purpose

A user keeps the views in their menu from the user settings.

## ADDED Requirements

### Requirement: A user orders and picks the views in their menu

`CnSavedViewMenuSettings` SHALL list the user's My views menu entries in menu order, each with the page it filters. The
user SHALL be able to reorder them (drag, arrow keys, move buttons), take one out with "Remove from menu" (which never
deletes the view) and add any view they can see on a page that offers saved views: the page's default views and the
saved views that belong on the page, those already in the menu left out. A new view SHALL go to the bottom. Every change
SHALL be stored through the menu holder's `set`.

#### Scenario: Reorder

- **GIVEN** "Woo requests" then "Deadline this week" in the menu
- **WHEN** the user moves "Woo requests" down
- **THEN** the stored list is "Deadline this week", "Woo requests"

#### Scenario: Remove from menu

- **GIVEN** "Woo requests" in the menu
- **WHEN** the user presses "Remove from menu" on it (accessible name "Remove from menu: Woo requests")
- **THEN** the stored list no longer has it and the view itself is untouched

#### Scenario: Add view

- **GIVEN** the Cases page offers the default view "Deadline this week", not in the menu
- **WHEN** the user picks it under "Add view"
- **THEN** it is stored at the bottom of the list

### Requirement: The user settings dialog offers the views in my menu

CnAppRoot's user settings dialog SHALL draw the Views in my menu section (key `views`) after the app's own sections when
a page of the app offers saved views, and not at all otherwise. `userSettingsSections` SHALL place or hide it like the
other keys.

#### Scenario: An app with saved views

- **GIVEN** an app with an index page that offers saved views
- **WHEN** the user opens the user settings
- **THEN** "Views in my menu" is drawn after the app's own sections
