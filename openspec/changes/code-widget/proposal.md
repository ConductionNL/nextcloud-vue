# A detail page can show a record as a code

## Why
buildiq puts a scannable label on a record's page (`pages-qr-and-barcodes` D3): a QR of the record's address, or a
Code 128 or EAN-13 of a field, with a download for printing. The library had a QR component but no widget for it and
no one-dimensional barcodes.

## What changes
The `code` widget type (CnCodeWidget): `format` qr, code128 or ean13, `source` field or address (`url` with tokens), a
Download as SVG button, and a sentence when the value cannot be drawn. `utils/barcode1d.js` encodes Code 128 (set B)
and EAN-13 without a dependency. Dutch strings added.
