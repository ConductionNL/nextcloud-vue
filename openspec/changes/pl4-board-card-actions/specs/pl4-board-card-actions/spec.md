# pl4-board-card-actions Delta: pl4-board-card-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-board-card-actions](../../)

## Purpose

A board card carries the list's row actions, and an endpoint board can be narrowed.

## ADDED Requirements

### Requirement: A card carries the row actions

An index page's board SHALL offer on each card, in a menu of its own, the row actions whose ids `board.cardActions`
names, in that order, with the card as the row; their `visibleWhen` SHALL hold per card. A pick SHALL run the action
as it runs on a table row. Without `cardActions` a card SHALL draw no menu.

#### Scenario: Assign from the card

- **GIVEN** a row action `assign` and `board.cardActions: ["assign"]`
- **WHEN** the person picks Assign on a card
- **THEN** the assign action runs for that card's lead

### Requirement: An endpoint source takes declared filters

An index page with `entitySource: "endpoint"` SHALL send the page filters `sourceConfig.searchFields` declares as the
endpoint's arguments, in that declaration's shape, and SHALL NOT send `searchFields` itself.

#### Scenario: A board narrowed to one pipeline

- **GIVEN** `sourceConfig: { url: "/apps/pipelinq/api/pipeline-items", searchFields: { pipeline: { single: true } } }`
- **WHEN** the narrow select picks pipeline p1
- **THEN** the endpoint is asked with `pipeline=p1`
