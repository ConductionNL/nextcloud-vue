# timeline Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [timeline-all-chip-host-label](../../)

## Purpose

The timeline's All chip uses the app's word.

## ADDED Requirements

### Requirement: The timeline's All chip reads the host's word

The timeline's "All" chip SHALL show the host app's translation of "All" when it has one, and the library's otherwise.

#### Scenario: DqZaakHistorie

- **GIVEN** dossiq, which translates "All" as "Alles"
- **THEN** the case history's first chip reads "Alles"
