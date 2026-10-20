# party-picker-refusal Delta: party-picker

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [party-picker-refusal](../../)

## Purpose

A party search the server could not read says so.

## ADDED Requirements

### Requirement: A refused term is said under the field

When a source answers a search with a 400, CnPartyPicker SHALL say under the field that the search could not be read, followed by the server's message, and SHALL clear that line on the next search that no source refuses. A source that fails otherwise SHALL be named under the field as not searched.

#### Scenario: An unclosed bracket

- **GIVEN** the picker over BRP persons
- **WHEN** the reader types `Visser (` and OpenRegister answers 400 "Unclosed bracket at position 7."
- **THEN** the field says "This search could not be read. Unclosed bracket at position 7."
