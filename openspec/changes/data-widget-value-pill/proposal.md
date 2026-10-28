# Proposal: data-widget-value-pill

## Why

Board PqKassabon draws the transaction's Status inside the "Transactie" card as a green pill ("Afgerekend"); the data
widget writes every value as text, so the status read as a plain word.

## What changes

- A field override `pill: { variantMap }` draws the shown value (its enum label or formatter text) as a status pill, toned
  by the raw value's entry in `variantMap` (`default` otherwise). Editing the field is unchanged.

Without the key nothing changes. No schema change (overrides are free-form).
