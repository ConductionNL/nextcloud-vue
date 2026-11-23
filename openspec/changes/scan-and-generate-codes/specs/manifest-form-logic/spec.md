# manifest-form-logic Delta: scan-and-generate-codes

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [scan-and-generate-codes](../../)

## Purpose

A form page fills a text field from a scanned code. Answers buildiq
`pages-qr-and-barcodes`, REQ-BQQR-002. Row `pg-scan-code` (buildiq
matrix).

## ADDED Requirements

### Requirement: A scan field fills a text value from the scanner

The manifest schemas and `validateManifestV2()` SHALL accept `scan` as a
`fields[].type` on `type: "form"` pages, with an optional `formats`
array of `qr`, `code128` and `ean13`. `cnRenderFormField` SHALL render
it as a text input with a Scan button that opens
`CnCodeScannerDialog` with those formats. A detected value SHALL replace
the text, and the user SHALL be able to edit it before submitting.
Typing into the input SHALL always work without the scanner.

#### Scenario: A clerk registers a parcel

- GIVEN the form "Pakket ontvangen" with a scan field `trackingcode`
- WHEN the clerk taps Scan and scans the parcel's barcode `3SABCD1234567`
- THEN `trackingcode` shows `3SABCD1234567`
- AND the form waits for Submit

#### Scenario: A handheld scanner types into the field

- GIVEN the same form on a desktop with a handheld scanner
- WHEN the clerk focuses `trackingcode` and scans
- THEN the scanner's keystrokes fill `trackingcode` without opening the dialog
