# chips-field Delta: abstract-chips-field

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-chips-field](../../)

## Purpose

A list of short strings in one array field of the current object, added and removed as chips, from configuration.

## ADDED Requirements

### Requirement: A chips field draws one chip per stored string

The `chips-field` widget SHALL draw one chip per entry of `objectData[content.field]` with a remove button named after
the chip, and an add chip labelled `content.addLabel`. With `content.options`, chips SHALL show the option's label and
the add chip SHALL offer the options not yet stored. `readOnly` SHALL hide the add chip and the remove buttons.

#### Scenario: E-mail domains

- **GIVEN** the stored list ["zuiddrecht.nl", "oosthaven.nl"]
- **WHEN** the widget renders
- **THEN** two chips and a "+ Domein" chip show

### Requirement: An entry is checked before it is added

A new entry SHALL be trimmed (and lowercased with `lowercase`) and refused with a message, before any request, when it
is empty, fails `pattern` (typed entries only) or is already stored.

#### Scenario: Not a domain

- **WHEN** the person adds "geen domein" and the pattern requires a dotted name
- **THEN** `patternMessage` shows and nothing is written

### Requirement: Add and remove save the full list in one PATCH

An add or a remove SHALL PATCH only `content.field` with the full new list. A refused PATCH SHALL show the server's
message and keep the chips as stored.

#### Scenario: Removing a chip

- **WHEN** the person removes "oosthaven.nl"
- **THEN** the PATCH carries the list without it
