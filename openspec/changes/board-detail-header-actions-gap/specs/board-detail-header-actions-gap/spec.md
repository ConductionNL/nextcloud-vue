# board-detail-header-actions-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-detail-header-actions-gap](../../)

## Purpose

The detail header buttons keep the board's spacing.

## ADDED Requirements

### Requirement: The detail header buttons are 10px apart

In the board look the buttons in a detail page's header SHALL be 10px apart, the same as every other board header
button row. No detail page rule SHALL override that gap.

#### Scenario: DqZaak

- **GIVEN** a case page in the board look
- **THEN** Bericht, Document, Contact vastleggen, Bewerken, buildiq and Meer are 10px apart
