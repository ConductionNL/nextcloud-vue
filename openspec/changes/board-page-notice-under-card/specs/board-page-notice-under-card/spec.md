# board-page-notice-under-card Delta: board-page-notice-under-card

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-page-notice-under-card](../../)

## Purpose

Place a page notice under the list card as the boards draw it.

## ADDED Requirements

### Requirement: A page notice sits 20px under the list card

In the board look, an index page with a page notice (`notice.placement:
'page'`) SHALL keep its body as tall as the list card, and the notice SHALL
sit the page's 20px gap under the card, without a margin of its own on top.

#### Scenario: Contracts

- **GIVEN** the contracts index with its page notice
- **WHEN** the page renders a 20-row table in the board look
- **THEN** the notice starts 20px under the table card
