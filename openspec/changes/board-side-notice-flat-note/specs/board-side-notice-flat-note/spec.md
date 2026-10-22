# board-side-notice-flat-note Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-side-notice-flat-note](../../)

## Purpose

A side notice is one tinted block.

## ADDED Requirements

### Requirement: The note inside a side notice paints no ground

In the board look the NcNoteCard of a banner inside a detail page's side notice SHALL have a transparent background,
whatever NcNoteCard sets, so the notice's own tint is the only ground.

#### Scenario: DqZaak "Advies gevraagd"

- **GIVEN** a case with an advice request in the board look
- **THEN** the side column's notice is one 300px tinted block, with no darker box inside it
