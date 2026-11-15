# Proposal: child-records-totals

## Why

Boards PqOfferte, PqLead and PqKassaAfrekenen draw order lines inside a form: a line total per row, a subtotal, tax and total under the table, and rows
taken from a catalogue, a free row, or a scanned code. pipelinq draws these with its own `LeadProducts`, `PosLineItemRow` and `PosTransactionTotalsWidget`.
`CnChildRecordsField` already edits the rows; it lacks the arithmetic and the add-from source.

## What changes

- `config.computed` on `CnChildRecordsField`: read-only columns worked out per row from a formula, optionally written into the row (`store`).
- `config.totals`: total rows under the table, as a sum over the rows or a formula over the totals above, and the event `totals`.
- `config.addFrom`: a search over another schema's records and an optional code field, mapped onto a new row; `freeRows: false` hides Add row.
- `utils/childRecordTotals`: `computeRow`, `computeTotals`, `storeComputed`, `rowFromSource`, on `evalFormula`.
- `fieldsFromSchema` passes `computed`, `totals` and `addFrom` from the property.
- Without these keys the field behaves as before.

Item 3 of the fleet component gap list (decisions 281, 320).
