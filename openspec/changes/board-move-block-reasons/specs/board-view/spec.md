# board-view Delta: board-move-block-reasons

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-move-block-reasons](../../)

## Purpose

A board can say why a card cannot go to a column, in the words of the guard that blocks it.

## ADDED Requirements

### Requirement: A move target can be blocked with a reason

A `moveTargetsHandler` answer and the `allowedMoves` prop SHALL accept entries `{ key, allowed, reason }` besides
plain ids, mixed in one answer. An entry with `allowed: false` SHALL block its column. In the card menu a blocked
column SHALL be disabled and show its reason under its name; without a reason it SHALL read "not allowed". While the
card is dragged, a blocked column with a reason SHALL show the reason under its header at full contrast. A drop on a
blocked column SHALL be refused with the reason, or with "{name} cannot move to {column}." without one, and SHALL
write nothing. A plain id SHALL allow its column as before.

#### Scenario: A Woo case without a decision

- **GIVEN** the handler answers `["s1", "s2", { "key": "s3", "allowed": false, "reason": "Er is nog geen besluit vastgelegd." }]` for a Woo case
- **WHEN** the person opens the case's menu
- **THEN** "Besluit" is disabled with "Er is nog geen besluit vastgelegd." under it, and "In behandeling" is open

#### Scenario: Dragging that case

- **WHEN** the person drags the case
- **THEN** Besluit shows "Er is nog geen besluit vastgelegd." under its header, and a drop there is refused with that sentence
