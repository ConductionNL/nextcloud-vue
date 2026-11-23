# menu-widget-links-under-router-base Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [menu-widget-links-under-router-base](../../)

## Purpose

A menu widget in an app mounted under a router base links and highlights its pages correctly, however a manifest
writes their URLs.

## ADDED Requirements

### Requirement: A menu URL that carries the app's base is a path in the app

When the app's router has a base and an item's URL starts with that base, `CnMenuWidget` SHALL treat the remainder as
the route path: the anchor's href SHALL carry the base once, and a plain click or keyboard activation SHALL push the
route path. Other URLs keep their current behaviour.

#### Scenario: Catalogue folders

- **GIVEN** dossiq's router mounted under `/index.php/apps/dossiq`
- **AND** a menu item with URL `/index.php/apps/dossiq/settings/case-types`
- **THEN** its href is `/index.php/apps/dossiq/settings/case-types`
- **AND** clicking it pushes `/settings/case-types`

### Requirement: The open page is the active item under a router base

Under a router base an item SHALL be active when its route path equals, or is a parent path of, the browser path below
the base, whether the item's URL was written with the base or without it.

#### Scenario: An item written as a route path

- **GIVEN** the browser on `/index.php/apps/dossiq/settings/attributes`
- **AND** a menu item with URL `/settings/attributes`
- **THEN** that item is the active item
