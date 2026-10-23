# map-widget-header-count Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-widget-header-count](../../)

## Purpose

A map card can say how many places it shows under its title.

## ADDED Requirements

### Requirement: A map card can say how many places it shows

CnMapWidget SHALL take `content.headerSubtitle` (`{ one, other }` or one string, with `{total}`), translate it through
the host, choose `one` for one marker and `other` otherwise, and report it as the `subtitle` of its `header` event once
the marker source answered with markers. Before that, on a failure, or without markers the subtitle SHALL be empty.

#### Scenario: DqZaak "Locaties"

- **GIVEN** a case with one location and the case map card declaring `headerSubtitle: { one: "{total} location", other: "{total} locations" }`
- **THEN** the card shows "1 locatie" under its title
