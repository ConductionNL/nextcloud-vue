## Why

A list of suggestions often ends in one choice that is written onto the page's record: "Assign" a suggested colleague on a ticket or a lead. pipelinq drew that list with its own component because a record list could only open, dispatch or call an endpoint per row, not write a field of the page's record.

## What changes

- A `rowActions` entry `{ type: "set-field", field, value, label, ariaLabel?, doneLabel? }` draws a button on each row that PATCHes `field` of the page's record with the row's `value`, hands the saved record to the page and reads the list again. The row whose value the record holds shows `doneLabel`.
- The detail page's `cnObjectContext` carries `setObject`, so a widget that saved the page's record can hand it back without a re-fetch.

## Impact

No schema change. First consumer: pipelinq's suggested colleagues (PL-ABSTRACT lane PL1).
