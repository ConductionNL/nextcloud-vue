# source-facet-picker-off Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [source-facet-picker-off](../../)

## Purpose

A page whose side panel filters a field does not draw a second picker for it after the search.

## ADDED Requirements

### Requirement: A source facet can leave its picker out

An endpoint source facet declaring `picker: false` SHALL draw no picker after the search; its counts SHALL still be
read off the answer. A facet without `picker` SHALL keep its picker.

#### Scenario: DqPostvak

- **GIVEN** the Postvak page's channel facet declares `picker: false`
- **THEN** no "Kanaal" picker follows the search, and the Filter panel filters on the channel
