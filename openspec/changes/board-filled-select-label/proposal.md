# Proposal: board-filled-select-label

## Why

In the board look a select's label stands above the control, both on a settings card (look-board.css) and in a board
dialog (dialog.css). Those rules set the label's bottom and reset its top, but NcSelect 9.11 has a heavier rule of its
own for a select that holds a value (eight classes, `.vs__selected-options:has(.vs__selected)`), which pins the top on
the border. Pinned at both ends, the label shrank to a sliver over the control: DqPersoonlijkeInstellingen
"Meldingsdomein" (Ruben, 23 Oct), DqInstellingen "Kadaster (BRK): bron", DqBeheerinstellingen "Zaakschema".

The navigation entries of the user settings dialog read in the theme's link colour: thematiq paints every link
`var(--nldesign-color-on-surface, <link colour>) !important`. The board draws them in the main text colour, the open
one marked by its tint and bar.

## What changes

- Both board label rules get a second selector that outranks NcSelect's filled-label rule.
- A user settings navigation entry sets `--nldesign-color-on-surface` to the main text colour.

## Scope

look-board.css, dialog.css, CnUserSettingsDialog.vue. No schema change.
