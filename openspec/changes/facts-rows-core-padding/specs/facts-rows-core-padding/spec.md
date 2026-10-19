# facts-rows-core-padding Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-rows-core-padding](../../)

## Purpose

A facts card's list starts where the card's spacing says, not where Nextcloud's list padding pushes it.

## ADDED Requirements

### Requirement: The facts list draws no core list padding

The facts widget's list SHALL draw no padding, whatever padding the host gives a `dl`.

#### Scenario: DqZaak "Behandeling"

- **GIVEN** a case detail page with a facts card in the side column
- **THEN** the first fact starts 12px under the card's title
