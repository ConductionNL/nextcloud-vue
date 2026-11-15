## ADDED Requirements

### Requirement: A detail page can show a record as a code

A `code` widget SHALL draw the record's address as a QR code, or a field of the record as a QR code, a Code 128 or an
EAN-13 barcode, in the browser, SHALL offer the drawing as an SVG download, and SHALL say why when the value cannot be
drawn in the chosen format.

#### Scenario: a device label
- **GIVEN** a `code` widget with `format: "code128"`, `source: "field"`, `field: "serienummer"`
- **WHEN** the device page opens for serial SN-0042
- **THEN** the page shows a Code 128 barcode of SN-0042 with the value under it and a Download as SVG button
