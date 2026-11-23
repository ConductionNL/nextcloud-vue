# A board dialog's checkbox is 24px and its notes add no margin

## Why

The dialog boards draw a checkbox row as an 18px label and space a note with the dialog's gap. NcCheckboxRadioSwitch takes 34px and NcNoteCard adds 15px above and below, so DqZaakSamenwerken's checkbox and note sat 25px lower than drawn (r32 dialog-card y +33.2; probed on :8080: field bottom to note 75 vs the board's 50; with these rules 50).

## What changes

- Board dialogs: a (non-button) checkbox row is at the 24px minimum target (WCAG 2.5.8), no block padding; an NcNoteCard has no block margin.
