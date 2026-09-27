---
kind: code
depends_on: []
---

# Proposal: scan-and-generate-codes

## Why

A technician holds a phone to a device label and wants the device's
record. A clerk scans a parcel's barcode into a form. An asset page
shows a QR code that opens that asset. Buildiq's page editors can
declare all three, but the pages are drawn by this library, and the
library has no camera scanner, no scan action, no scan field and no
code widget. It has no decoding or drawing library either.

## Rows

The requesting change is buildiq `pages-qr-and-barcodes`. Its proposal,
section "Sibling halves", names this half:

> nextcloud-vue: the renderer. It owes a scanner (camera preview,
> decoding QR, Code 128 and EAN-13, typed fallback) used by a `scan`
> index action and a `scan` form field type, the lookup that opens or
> filters by the scanned value, and a `code` widget that draws a QR code
> or barcode as SVG in the browser. At 2.57.1 it has none of these and
> no decoding or drawing library in its dependencies.

Its tasks.md, T06: "File the renderer half with nextcloud-vue: the
scanner, the `scan` index action and lookup, the `scan` form field and
the `code` widget, with this spec as the contract. Verify: the
nextcloud-vue change exists and cites REQ-BQQR-001 to REQ-BQQR-003." Its
design names the shapes: D1 `config.scan = {enabled, field, onMatch}`
with `onMatch` `open` or `filter`; D2 a form field type `scan` with
`formats[]` (`qr`, `code128`, `ean13`); D3 a widget type `code` with
`format` and `source` (`field` or `address`) and "Download as SVG".

Rows the requesting change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `pg-scan-code` | Scan a QR code or barcode with a phone to open or act on a record. |
| buildiq | `pg-generate-code` | Generate a QR code or barcode for a record on its page. |

Read for this change: the sibling's claim holds. `src/` has no scanner,
and `package.json` has no decoding or drawing library.

## What changes

- A scanner dialog, `CnCodeScannerDialog`: a camera preview that
  decodes QR, Code 128 and EAN-13, and a text input that is always
  there for typing or a handheld scanner.
- Index pages take `config.scan`. A Scan button opens the scanner, and
  the scanned value opens the one matching record, filters the list to
  the matches, or says no record has this code.
- Form pages take a `scan` field: a text input with a Scan button.
- Detail pages get a `code` widget that draws a QR code, a Code 128 or
  an EAN-13 barcode as SVG from a field or the record's own address,
  with Download as SVG.
- One new dependency, `@zxing/library`, loaded only when a scan starts
  or a QR code is drawn.

## Affected projects

- `nextcloud-vue`: new `CnCodeScannerDialog`, `CnScanField`,
  `CnObjectCodeWidget`, a barcode encoder, `CnIndexPage`,
  `CnActionsBar`, `cnFormFieldRenderer.js`, the manifest schemas,
  `validateManifest.js`, `package.json` and both rollup configs.
- Consumers: buildiq built apps first. Any manifest app can use the
  scan action, the field and the widget.

## Backward compatibility

Everything is opt-in. An index page without `config.scan` shows no Scan
button. The `scan` field type and the `code` widget are new names. The
new dependency is external and loaded on demand, so an app that never
scans or draws a QR code downloads none of it.

## Out of scope

- Printing labels in bulk. The widget shows one record's code.
- Formats other than QR, Code 128 and EAN-13.
- The browser permission for the camera. Buildiq allows it per app
  (its D4); the scanner asks only when the user presses Scan.
- Taking photos. That is the open change `form-file-and-camera-fields`.

## Cross-project dependencies

- buildiq writes `config.scan`, the `scan` field and the `code` widget,
  validates them (its D5), and allows the camera on apps that scan (its
  REQ-BQQR-004).
- OpenRegister filters a list by a property value, as the index page's
  deep-link filters already use. Nothing new is asked of it.
