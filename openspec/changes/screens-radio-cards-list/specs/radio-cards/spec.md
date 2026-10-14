# radio-cards Delta: screens-radio-cards-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-radio-cards-list](../../)

## Purpose

A choice between a few options can draw as the compact radio list the boards use.

## ADDED Requirements

### Requirement: Radio cards can draw as a compact list

The radio-cards widget SHALL take `content.variant`, `cards` (default) or `list`. With `list` each option SHALL draw as
one line with its radio and label, the description under the label, and no card around it, in one column. Choosing an
option SHALL save as it does for cards.

#### Scenario: Kind of organisation

- **GIVEN** a radio-cards widget with `variant: "list"` and the options Gemeente, Vereniging of VvE, Onderneming and Team, each with a description
- **WHEN** it renders
- **THEN** the options stand one under the other, each without a border, and the four take far less height than four cards
