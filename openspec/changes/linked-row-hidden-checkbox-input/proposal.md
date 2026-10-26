# Proposal: linked-row-hidden-checkbox-input

## Why

Measured on :8080 (DQ-L8, 23 Oct): DqZaaktypen's rows are 69px where the board draws 66. The selection checkbox's
hidden input (NcCheckboxRadioSwitch, `position: absolute` behind its icon) is caught by the linked-row rule that lifts
every control in a row above the row link with `position: relative`. In the flow it takes Nextcloud's 34px input
height and 3px margins, a 40px block in a 14px-padded cell. Every table with a row route and a selection column is
affected.

## What changes

The linked-row lift skips `.checkbox-radio-switch__input`. The selection cell itself stays lifted, so the checkbox is
still clickable above the row link.

## Reach

CnDataTable rows with a route. No prop or schema change.
