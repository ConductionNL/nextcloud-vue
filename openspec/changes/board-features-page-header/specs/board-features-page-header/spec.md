# board-features-page-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-features-page-header](../../)

## Purpose

The Features and roadmap page in the board look has the page header of every other board page.

## ADDED Requirements

### Requirement: The board features page has the board page header

In the board look `CnFeaturesAndRoadmapView` SHALL mark its root `cn-features-and-roadmap-view--board` and add no
padding around `CnFeaturesBoard`. The buttons in `.cn-features-board__header-actions` SHALL take the board's header
button rules. The board's meta line SHALL be 14px in `--color-text-maxcontrast`; a segmented status option SHALL have
no margin and, at rest, the `--cn-board-text-soft` ink.

#### Scenario: DqFunctionaliteiten header

- **GIVEN** dossiq's Features and roadmap page in the board look
- **THEN** the title starts 28px from the navigation and 28px under the top bar, "Documentatie" is a 40px header
  button, and "Alles", "Stabiel", "Beta" and "Gepland" stand 2px apart
