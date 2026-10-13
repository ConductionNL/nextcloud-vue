# index-header Delta: screens-index-header-actions-menu

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-header-actions-menu](../../)

## Purpose

An index page with header buttons keeps its Actions menu, with the entries the page names.

## ADDED Requirements

### Requirement: The header Actions menu lists what its items name

A `headerButtons` entry with `action: "actions-menu"` and `items` SHALL draw one menu beside the header buttons whose
entries are the named ones, in order: `header-actions`, a header action id, `import`, `export`, `refresh`,
`copy-selected`, `delete-selected` or `documentation`. `documentation` SHALL be a link to the page's documentation URL
that opens in a new tab, and SHALL be left out when the page has none. The selection entries SHALL be disabled while
no row is selected. Without `items` the menu SHALL list the header actions only.

#### Scenario: The board's Acties menu

- **GIVEN** `items` is `["goto", "import", "copy-selected", "delete-selected", "refresh", "documentation"]` and the page has a documentation URL
- **WHEN** the person opens the Acties menu
- **THEN** it lists those six entries in that order, and Documentation is a link in a new tab

#### Scenario: No items

- **WHEN** the button declares no `items`
- **THEN** the menu lists the page's header actions, and is not drawn when there are none

### Requirement: A header action can be a link

A header action with `type: "navigate"` and a `target` URL SHALL be drawn as a link to that URL.

#### Scenario: A manual link

- **GIVEN** a header action `{ id: "manual", label: "Handleiding", type: "navigate", target: "https://docs.example/handleiding" }`
- **WHEN** the menu renders
- **THEN** "Handleiding" is an anchor to that URL
