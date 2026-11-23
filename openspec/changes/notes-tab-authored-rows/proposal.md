# Proposal: notes-tab-authored-rows

## Why

DqZaakEmail draws each case note as an authored row: the author's initials in a 32px round tile, the note's text in
bold, and under it one muted line "author · time" ("Pieter Jansen · 6 okt 15:52"). CnNotesTab draws every note as
the NcListItem it uses in the sidebar: a comment icon, the author as the row's name and the text under it, the time
at the far end. Other apps use the tab in the sidebar and keep that look, so the board row is an option.

## What changes

- CnNotesTab gets `noteRows: 'list' | 'authored'` (default `list`, which changes nothing).
- With `authored` each note leads with its author's initials (the signed-in user's own notes on the primary tint,
  others neutral), its text is the row's bold first line, and its second line is "author · time" with the edit
  marker after it. A reply's quote stays above that line. The row's actions (reply, edit, history, delete and the
  app's own) stay as they are.
- The `notes` integration forwards `noteRows` to the tab.

## Scope

CnNotesTab.vue, integrations/builtin/notes.js. No schema change, no new strings.
