# Proposal: record-list-row-refs

## Why

Board PqContract lists a contract's lines as a table of product, description, quantity and value per unit. The lines live on the contract (`lineItems`), each naming its product by uuid (`productRef`). A record list can list those rows (`objectRows`), but it could only print the uuid, not the product's name.

## What changes

`objectRows.refs` (`[{ field, register, schema, as }]`): the record list reads the record each row names in `field` (once per record, fifty at most) and puts it on the row as `as`, so templates reach `{product.name}`. A record that cannot be read leaves the row without it.

## Scope

CnRecordListWidget and its docs. No schema change: record-list content is not closed by the schema.
