# An index page finds a record by scanning its code

## Why
buildiq's index pages can find a device by scanning its label (`pages-qr-and-barcodes` D1): `config.scan = { enabled,
field, onMatch }`.

## What changes
CnIndexPage takes `scan`. A scan field above the list filters on `field` through the address; with `onMatch: "open"`
a single match opens its record through the View event, and no match says "No record has this code." Dutch strings
added. No schema change: index config is open.
