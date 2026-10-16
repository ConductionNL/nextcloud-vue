# link-cards-page Delta: screens-links-module-cards

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-links-module-cards](../../)

## Purpose

Module cards on a links page, from configuration.

## ADDED Requirements

### Requirement: A links page can show modules

A `type: "links"` page with `config.modules` SHALL draw one module card per module the reader may see (its
`permission` and `visibleIf` pass), above the link cards, under a heading (`modulesTitle`, default "Modules") with the
count of modules in the menu out of all shown. A module SHALL read as in the menu when `enabled` is true, else when its
`enabledIf` condition passes against `runtime`. A card SHALL name its pages, every page for four or fewer, else the
pages marked `highlight` (or the first three) after the total, link each page, and offer Open (to `route`, else the
first page). A module that is off SHALL also show a link to `settings` (the admin settings), only when its `permission`
and `visibleIf` pass; the page SHALL never turn a module on itself. `footnote` SHALL render under the cards.

#### Scenario: A module that is off, for a reader who is not an admin

- GIVEN a module with `enabled: false` and `settings: { route, permission: "admin" }`
- WHEN a reader without the admin permission opens the page
- THEN the card reads "Off", has an Open button and no admin-settings link

#### Scenario: The count

- GIVEN four visible modules, three of them in the menu
- WHEN the page renders
- THEN the heading reads "3 of 4 are in the menu"

### Requirement: A group can be a list card

With `config.groupStyle: "list"` a links page SHALL draw each group as one card, its caption as the card title, with a
row per link (icon, label, description) ending in a chevron, or an external-link icon for an `href` link.

#### Scenario: An external link

- GIVEN groupStyle list and a card with an `href`
- WHEN the page renders
- THEN its row ends in the external-link icon and opens in a new tab
