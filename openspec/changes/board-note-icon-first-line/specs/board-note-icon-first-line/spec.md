# board-note-icon-first-line Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-note-icon-first-line](../../)

## Purpose

A board note reads like the boards draw it: the icon on the first line.

## ADDED Requirements

### Requirement: A board note sets its icon on the first line

In the board look an info note SHALL have 10px 14px of padding and radius 10, and its 18px icon SHALL sit at the top of
the note, level with the first line, not centred on the note's height. In a board dialog the note's text SHALL be 13px.
A record list notice's icon SHALL also sit on the first line. The Nextcloud look keeps NcNoteCard's own layout.

#### Scenario: DqBerichtVersturen note

- **GIVEN** the "Bericht versturen" dialog in the board look with a two-line info note
- **THEN** the icon starts 14px from the note's left edge and 11px from its top, and the text is 13px

#### Scenario: DqZaaktypeOverzicht record list notice

- **GIVEN** a record list widget in notice presentation in the board look
- **THEN** its icon sits level with the first line of the notice
