---
kind: code
---

# Proposal: screens-currency-format

## Summary

The Mijn werk page wrote a lead's value as "€ {value}" with a constant sign: record-list had no currency format,
and a table column could only name one fixed code. A money amount now reads in its currency, in the reader's language.

## What changes

1. Template tokens `{path|currency}` (EUR), `{path|currency:USD}` (a code) and `{path|currency:price.code}` (the code in a row field).
2. The `currency` formatter and the `format: { style: "currency" }` cell take `currencyField` (and `formatterOptions.currencyField`) beside `currency`.
3. The number follows the Nextcloud user language ("€ 1.234,50" for Dutch).

No schema change. Without the keys, a cell reads as before (apart from following the user language instead of the browser's).
