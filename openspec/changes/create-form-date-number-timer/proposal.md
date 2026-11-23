# Proposal: create-form-date-number-timer

## Why

Board DqZaak draws "Uren registreren": hours per person on the case, then a row with Datum, Uren and Omschrijving,
"Uren vastleggen" and "Timer starten". The list is a `CnRecordListWidget` with `aggregates`, and the off state is the
widget's `visibleWhen`. The row is almost a `CnCreateFormWidget`, which has no date or number field, no timer, and cannot
link the new object to the record on a detail page.

## What changes

- Field types `date` and `number`; a number is written as a number.
- `content.timer`: `{ field, unit?, startLabel?, stopLabel? }`, a button that times work and writes the time into a field.
- Props `objectId` and `objectData`, so `values` can hold `@objectId` and `@object.<field>`.

Backward compatible. Covers gap 6 of the dossiq component-gap audit (decision 281), in place of the proposed
`CnTimeEntriesWidget`.
