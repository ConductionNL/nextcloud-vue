# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-subtitle-and-list-export](../../)

## ADDED Requirements

### Requirement: A widget card can carry a subtitle

A widget card on a detail page SHALL draw the widget's `subtitle` (or its content's) as a muted line under its title,
through the host's translate. Without one it SHALL draw none.

#### Scenario: DqZaakAssistent

- **GIVEN** the case's activity list declares a subtitle
- **THEN** "Elke suggestie wordt vastgelegd, ook als niemand hem gebruikt" stands under its title
