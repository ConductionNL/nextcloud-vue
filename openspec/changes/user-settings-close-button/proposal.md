# Proposal: user-settings-close-button

## Why

The user settings dialog's close button has a scoped `position: absolute`, but NcButton's own `position: relative`
wins at the same weight. The button therefore stands in the body's flex row, stretched to the dialog's height: 34x575
on DqPersoonlijkeInstellingen, with its icon halfway down the dialog. This happens in every look. COMPDIFF r23 measured
it as "Sluiten" `h 44>755`. The board draws a 44px round button 8px from the top and end.

## What changes

- The close rule takes one class more (`.cn-user-settings-dialog__body > .cn-user-settings-dialog__close`), so it is
  placed in the corner in every look.
- In the board look it is the board's 44px round button with no edge.

## Scope

CnUserSettingsDialog.vue (scoped rule), dialog.css. No schema change.
