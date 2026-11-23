# index-actions-menu-with-header-buttons Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-actions-menu-with-header-buttons](../../)

## Purpose

An index page can keep its Actions menu beside header buttons.

## ADDED Requirements

### Requirement: An index page decides its toolbar Actions menu

An index page's `showActionsMenu` SHALL decide whether its toolbar draws the Actions menu: `true` draws it even when
the header carries buttons, `false` leaves it out, and without the key it is drawn unless the header carries buttons.

#### Scenario: DqAfdelingen

- **GIVEN** the departments page with a Download header button and `showActionsMenu: true`
- **THEN** "Downloaden" stands beside the title and "Acties" in the toolbar above the search field
