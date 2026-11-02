# notes-tab-authored-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notes-tab-authored-rows](../../)

## Purpose

A page card can list its notes as the boards draw them, led by who wrote them, while the sidebar keeps its list.

## ADDED Requirements

### Requirement: The notes tab can draw a note as an authored row

With `noteRows: 'authored'` CnNotesTab SHALL draw each note with its author's initials in a round tile instead of
the comment icon, SHALL show the note's text as the row's first line in bold, and SHALL show under it one line with
the author's name and the note's time joined by " · ", followed by the edit marker when the note was edited. The
tile SHALL use the primary tint for the signed-in user's own notes and the neutral tint for others. The tile is
decorative; the author stays readable in the second line. The row's actions SHALL be the same as without the
option. The `notes` integration widget SHALL forward `noteRows` to the tab. Without the option, or with `list`, the
tab SHALL draw its notes as before.

#### Scenario: DqZaakEmail "Notities"

- **GIVEN** the case notes with `noteRows: 'authored'` and a note by Pieter Jansen, the signed-in user
- **THEN** its row shows "PJ" on the primary tint, the note's text in bold, and "Pieter Jansen · 6 okt 15:52" under it

#### Scenario: The time comes from OpenRegister's createdAt

- **GIVEN** a note as OpenRegister's notes endpoint sends it, with its moment in `createdAt` and no `creationDateTime`
- **THEN** the second line reads the author and the note's time as the boards write it ("Lars de Koning · 6 okt 09:31"), with the year added outside the current one
- **AND** replies under a note are ordered oldest first by that moment

#### Scenario: The board look keeps the row in the main ink

- **GIVEN** the authored rows in the board look, under a theme that colours and underlines every link with `!important`
- **THEN** the note's text keeps the main ink with no underline, and the author and time line the muted ink

#### Scenario: The sidebar keeps its list

- **GIVEN** the notes tab without `noteRows`
- **THEN** each note shows the comment icon with the author as the row's name, as before
