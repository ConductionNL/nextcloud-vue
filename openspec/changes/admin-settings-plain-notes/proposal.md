# Proposal: admin-settings-plain-notes

## Why

The boards drawn from NcBeheerInstellingen (dossiq's admin tabs) draw a card's note without an icon, and a warning note on a peach ground (#fff4e5) with a #f0c987 edge. Live drew NcNoteCard's icon and mixed the warning ground from `--color-warning`, which the zuiddrecht theme sets to a dark ink, so the note read grey-brown (r34 DqBeheerGeavanceerd "KCC-werkplek-integratie" structure, warning card colours on DqBeheerGeavanceerd and DqBeheerinstellingen). Other admin boards (PtBeheerinstellingen) do draw the icon, so it is an opt-in.

## What changes

- `CnAdminSettingsShell` gets a `plainNotes` prop that marks the shell.
- Under the board look, a marked shell hides its cards' note icons and draws a warning note on the board's peach ground and edge.
