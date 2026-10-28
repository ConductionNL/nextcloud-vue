# Proposal: action-dialog-fields-after-note

## Why

DqArchiveren draws the archive dialog with the "let the requester know" checkbox at the end, under the reason and the
read-only note. CnActionDialog always drew its fields before the reason, so the note stood 58px lower than drawn and
the checkbox sat between the checklist and the reason. Its facts, section titles and the reason's help line also took
the body's 1.5 line, which made each fact row 68px against the board's 59.

## What changes

- `fieldsAfterNote: true` in the dialog config draws the fields after the reason and the note. Without it the order
  stays fields, reason, note.
- Facts, section titles and the reason's help line (13px) sit on the font's normal line, and the reason's text area
  leaves no gap above its help line.

## Scope

Additive config key; the rhythm change applies to every action dialog.
