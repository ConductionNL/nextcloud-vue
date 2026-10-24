# Proposal: cell-text-template

## Why

DqPostvak draws the Voorstel pill as "Lijkt op 2026-0079" and Binnengekomen via as "E-mail, gemeente@"; :8080 showed the
bare case number and the full address "zaken@zuiddrecht.example". A cell could show one value only.

## What changes

- `label` and `badge` cells take `widgetProps.textTemplate`: translated, filled from the row, `{value}` the cell's own
  label (an enum's label included).
- `fillTemplate` gains the `mailbox` format: an address up to and with its @.
