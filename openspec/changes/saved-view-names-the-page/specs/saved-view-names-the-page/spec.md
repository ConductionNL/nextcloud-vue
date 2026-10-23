# saved-view-names-the-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-names-the-page](../../)

## Purpose

A list opened through a saved view says which view it is.

## ADDED Requirements

### Requirement: An applied saved view can name the page

With `savedViewTitle` on, an index page SHALL use the applied saved view's name as its title and as its side panel's
title. Without an applied view, or with the option off, the page title SHALL stay as configured.

#### Scenario: DqFilterInMenu

- **GIVEN** the Cases page sets `savedViewTitle: true`
- **WHEN** Pieter opens "Termijn deze week" from the menu
- **THEN** the page and its side panel are titled "Termijn deze week"

#### Scenario: No view applied

- **GIVEN** the same page with no saved view applied
- **THEN** it is titled "Alle zaken"
