# Proposal: child-records-resolve

## Why

Board PqLead prices a product line for the ordered quantity. A product can have a quantity tier, a variant or a client price list, and only the app's server knows which price applies. `CnChildRecordsField`'s `addFrom` copies the product's own `unitPrice` onto the row. It has no way to ask the server, so a lead line shows the base price for 12 licences where the tier price is due (pipelinq change `products-quote-from-lead`, task 1).

## What changes

- `config.addFrom.resolve` on `CnChildRecordsField`, as `{ url, method?, body, map, when? }`. Once a row is added from a source record, the field sends `body` to `url` with `@source`, `@source.<key>` and `@row.<key>` filled in, and writes the answer into the row through `map` (row key to answer key).
- A change to a `when` key (e.g. `quantity`), in the row dialog or typed into the cell, asks again. A cell edit waits until typing stops. When the user types a value of their own into a mapped key in the same edit, that value is kept and nothing is asked.
- A failed answer leaves the row as it was and says so under the table.
- `utils/childRecordResolve`: `resolveBody`, `patchFromAnswer`, `shouldResolveAgain`, `sourceIdKey`.
- Without `resolve` the field behaves as before.
