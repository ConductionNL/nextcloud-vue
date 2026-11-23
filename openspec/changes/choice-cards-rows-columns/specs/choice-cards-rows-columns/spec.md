# choice-cards-rows-columns Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [choice-cards-rows-columns](../../)

## Purpose

Option rows can sit side by side, and a group whose dialog title already names the choice can drop its visible label.

## ADDED Requirements

### Requirement: Option rows can stand side by side

With `layout="rows"` and `columns` above 1, CnChoiceCards SHALL lay its option rows out as a grid of that many equal
columns. With `columns` 0 or 1 the rows SHALL stay stacked in one column.

#### Scenario: DqZaakSamenwerken

- **GIVEN** the share dialog's two options in rows with `columns` 2
- **THEN** "Share" and "Hand over" stand side by side, each half the width

#### Scenario: default rows

- **GIVEN** option rows without `columns`
- **THEN** they stack in one column as before

### Requirement: The legend can be kept for assistive tech only

With `hideLabel` CnChoiceCards SHALL keep `label` as the fieldset's legend, visually hidden, so the group keeps its
accessible name.

#### Scenario: hidden legend

- **GIVEN** a choice with `label` "What you do" and `hideLabel`
- **THEN** the legend "What you do" is in the DOM with the `hidden-visually` class
