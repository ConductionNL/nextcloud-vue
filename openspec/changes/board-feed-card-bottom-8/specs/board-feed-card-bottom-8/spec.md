# board-feed-card-bottom-8 Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-feed-card-bottom-8](../../)

## Purpose

A ruled feed card ends where the contact boards draw it.

## ADDED Requirements

### Requirement: A ruled feed card ends 8px under its last row

In the board look a page card's ruled feed (`presentation: feed`, `ruleAbove`) SHALL end 8px under its last row.
Every other page card SHALL keep its 20px bottom, and Nextcloud's own look SHALL be unchanged.

#### Scenario: DqOrganisatie "Laatste contactmomenten"

- **GIVEN** the feed of the organisation's latest moments
- **THEN** the card's bottom padding is 8px

#### Scenario: DqOrganisatie "Zaken"

- **GIVEN** a ruled list card on the same page
- **THEN** the card's bottom padding stays 20px
