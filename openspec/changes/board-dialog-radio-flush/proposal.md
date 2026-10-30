# Proposal: board-dialog-radio-flush

## Why

COMPDIFF pl6 PqAanvraagOmzetten: the "Klant" and "Contactpersoon" choices in the link dialog drew their radios 7px in
from the card edge (24 vs 17) on 34px rows. The board draws a dialog's radio as it draws a checkbox: flush with the
fields, the label 10px after it, a 24px row. The board dialog rules already did that for checkboxes only.

## What changes

- In a board dialog a radio (`NcCheckboxRadioSwitch type="radio"`, not the button variant) gets the checkbox rules: no
  inline padding, a 10px gap to its label, a 24px row.
