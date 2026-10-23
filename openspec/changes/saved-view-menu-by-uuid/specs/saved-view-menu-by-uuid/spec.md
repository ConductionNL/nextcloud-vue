# saved-view-menu-by-uuid Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-menu-by-uuid](../../)

## Purpose

A saved view put in the menu by its uuid stays in the menu.

## ADDED Requirements

### Requirement: A menu entry may name its view by uuid

A saved-view menu entry whose id is the view's uuid SHALL count as that view: the panel SHALL show it as in the menu,
and the page's sync SHALL keep the entry and store it under the view's id.

#### Scenario: DqFilterInMenu

- **GIVEN** Pieter's menu list names "Termijn deze week" by uuid
- **WHEN** he opens Alle zaken
- **THEN** the view stays in his menu, its panel menu offers "Uit menu halen", and the list stores the view's id
