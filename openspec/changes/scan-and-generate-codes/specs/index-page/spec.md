# index-page Delta: scan-and-generate-codes

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [scan-and-generate-codes](../../)

## Purpose

An index page scans a QR code or barcode with the device camera and
opens or filters to the matching record. Answers buildiq
`pages-qr-and-barcodes`, REQ-BQQR-001. Row `pg-scan-code` (buildiq
matrix).

## ADDED Requirements

### Requirement: A scanner reads QR codes and barcodes and always accepts typing

The library SHALL provide `CnCodeScannerDialog`, which starts the rear
camera only when it opens, decodes QR, Code 128 and EAN-13 from the
preview, and emits `detected` with the value and its format. It SHALL
always show a text input whose Enter emits the typed value. It SHALL
stop every camera track on detection, on close and on unmount. When the
camera is refused, missing or blocked, it SHALL say so and keep the
input usable. It SHALL use the browser's own barcode detector when that
supports the three formats, and `@zxing/library`, loaded on demand,
otherwise.

#### Scenario: A technician scans a label on a phone

- GIVEN the scanner open on a phone whose browser has no barcode detector
- WHEN the technician points the camera at a Code 128 label reading `SN-40211`
- THEN the dialog emits `SN-40211` with format `code_128`
- AND the camera light goes off

#### Scenario: A refused camera still lets the user type

- GIVEN a user who refuses the camera
- WHEN the scanner opens
- THEN it says the camera is not available
- AND typing `SN-40211` and pressing Enter emits `SN-40211`

### Requirement: An index page opens or filters by a scanned value

`CnIndexPage` SHALL show a Scan button when `config.scan.enabled` is
true, and SHALL NOT show it otherwise. On a detected value it SHALL send
one lookup on its objects endpoint with `config.scan.field` equal to the
value and a limit of two, without changing the list. With no match it
SHALL say "No record has this code." and leave the list as it was. With
one match and `onMatch: "open"` it SHALL open that record as a row click
does. Otherwise it SHALL filter the list to `config.scan.field` equal to
the value, as a removable filter.

#### Scenario: A technician opens a device by its label

- GIVEN the index page "Apparaten" with `scan: { enabled: true, field: "serienummer", onMatch: "open" }`
- WHEN a technician taps Scan and scans `SN-40211`
- THEN the detail page of the device with `serienummer` `SN-40211` opens

#### Scenario: No match is said plainly

- GIVEN the same page filtered to status "In gebruik"
- WHEN the scanned code matches no record
- THEN the page says "No record has this code."
- AND the list still shows the "In gebruik" devices

#### Scenario: Several matches filter the list

- GIVEN a page with `onMatch: "filter"` and two records with `serienummer` `SN-40211`
- WHEN the user scans `SN-40211`
- THEN the list shows those two records with a filter the user can remove
