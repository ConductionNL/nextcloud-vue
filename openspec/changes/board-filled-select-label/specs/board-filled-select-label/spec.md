# board-filled-select-label Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-filled-select-label](../../)

## Purpose

A board select reads its label above the control, with or without a value, and the user settings navigation reads in
the main text colour.

## ADDED Requirements

### Requirement: A board select with a value keeps its label above the control

On a board settings card and in a board dialog, the label of an NcSelect that holds a value SHALL stand above the
control at its full line height, as it does for an empty select.

#### Scenario: DqPersoonlijkeInstellingen "Meldingsdomein"

- **GIVEN** the notices section with the domain select holding "Al mijn werk"
- **THEN** "Meldingsdomein" is at least 12px tall and ends above the control

### Requirement: The user settings navigation reads in the main text colour

The navigation entries of the user settings dialog SHALL be drawn in the main text colour, also under a theme that
paints links in its link colour; only the open entry is marked, by its tint and bar.

#### Scenario: Under thematiq

- **GIVEN** a theme rule `a { color: var(--nldesign-color-on-surface, <link colour>) !important }`
- **THEN** every navigation entry has the main text colour
