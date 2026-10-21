# integration-leaf-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [integration-leaf-card](../../)

## Purpose

Every integration leaf that draws no card of its own gets one integration-widget look, the library card, in every app.

## ADDED Requirements

### Requirement: A mount-mode leaf can take the library card

A mount-mode integration descriptor with `chrome: "card"` SHALL be hosted on a detail page's card surface in the
library widget card, titled with the manifest title or else the descriptor label. In a tab panel, and for a descriptor
without the flag, the leaf SHALL render as before.

#### Scenario: planninq projects on a dossiq case

- **GIVEN** a case detail page placing the `planninq-projects` leaf in its body grid
- **WHEN** the leaf declares `chrome: "card"`
- **THEN** it sits in a bordered card titled "Projecten"

#### Scenario: a leaf that draws its own card

- **GIVEN** humaniq's hours leaf, which declares no `chrome`
- **THEN** the host draws no card around it

### Requirement: A carded leaf reports its count, actions and empty state

The host SHALL hand a carded leaf an `onHeader(header)` mount prop. `header.count` SHALL draw as a badge beside the
title, `header.actions` as the standard header buttons, and `header.empty` (`{ name, description }`) as the library empty
state. A later report SHALL replace the earlier one.

#### Scenario: no projects yet

- **GIVEN** the projects leaf reports `count: 0`, the actions "Openen in Planninq" and "Nieuw project", and an empty state
- **THEN** the card shows a 0 badge, the two buttons in its header and the library empty state
