# header-item-card-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-item-card-button](../../)

## Purpose

A widget can put the card's outlined button, or a menu behind it, in its card's title row.

## ADDED Requirements

### Requirement: A secondary header action is the card's outlined button

A header action a widget reports with `variant: "secondary"` SHALL be drawn as a secondary NcButton with its icon and
label, named by `ariaLabel` when given, and SHALL run the action on click.

#### Scenario: PqKlant Relaties "Toevoegen"

- **GIVEN** the relationships card reports `{ label: "Add", ariaLabel: "Add relationship", variant: "secondary" }`
- **THEN** the title row draws an outlined "Toevoegen" button named "Relatie toevoegen"

### Requirement: A secondary header action with items opens a menu

A secondary header action with `items` SHALL be drawn as a secondary NcActions menu named by its label, with one entry
per item that runs that item; the host SHALL keep such an action when it has no `run` of its own.

#### Scenario: PqKlant Contactkanalen "Toevoegen"

- **GIVEN** the channels card reports an action with items e-mail address, phone number and social profile
- **THEN** the title row draws an outlined "Toevoegen" menu with those three entries

### Requirement: A side card shows its card button

In the board look a side card's actions SHALL show when they hold a card button, as they do for a catalog action.

#### Scenario: Side column

- **GIVEN** a side card whose widget reports a secondary header action
- **THEN** the button is visible in the card's title row
