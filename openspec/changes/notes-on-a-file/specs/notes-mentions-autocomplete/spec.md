# notes-mentions-autocomplete Delta: notes-on-a-file

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notes-on-a-file](../../)

## Purpose

`CnNotesCard` shows and adds notes on a file as Nextcloud file comments.
Answers filinq `work-document-notes` (row `wk-notes`, REQ-WDN-001).

## ADDED Requirements

### Requirement: The notes card takes a file as its source

`CnNotesCard` SHALL accept `fileId`. When `fileId` is set and no object
is given, the card SHALL list the file's Nextcloud comments, SHALL add a
note as a file comment, and SHALL offer delete on the user's own
comments, through `/remote.php/dav/comments/files/{fileId}`. With an
object given, the card SHALL behave as before.

#### Scenario: A registrar leaves a line on a letter

- GIVEN a letter in My documents with no record behind it
- WHEN the registrar writes "Check with finance before assigning" in the notes card and saves
- THEN the note is listed in the card
- AND the same note shows in the Files sidebar's comments for that file

#### Scenario: A colleague without access sees nothing

- GIVEN a colleague who cannot open the file
- WHEN a card for that file is mounted for her
- THEN it shows no notes and no add field, because Nextcloud refuses the request

### Requirement: File comments are usable without the card

`useFileComments(fileId)` SHALL expose `list`, `add`, `remove` and
`count` over the same endpoint, exported from the package root.

#### Scenario: A row shows its note count

- GIVEN a list that calls `count()` for a file with three comments
- WHEN the row renders
- THEN it shows 3
