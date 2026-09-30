# grid-widget-system Delta: scan-and-generate-codes

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [scan-and-generate-codes](../../)

## Purpose

A detail page shows a QR code or a barcode for its record. Answers
buildiq `pages-qr-and-barcodes`, REQ-BQQR-003. Row `pg-generate-code`
(buildiq matrix).

## ADDED Requirements

### Requirement: A code widget draws a QR code or barcode for the record

The library SHALL register a detail-page widget of type `code` with
`format` (`qr`, `code128` or `ean13`) and `source` (`field` with a
property name, or `address`). It SHALL draw the code as SVG in the
browser from the property's value or from the absolute URL of the
record's detail route. It SHALL offer Download as SVG. An EAN-13 value
SHALL be 12 digits, to which the check digit is added, or 13 digits
with a correct check digit. A value the format cannot hold SHALL show a
sentence saying why instead of a code. The SVG SHALL carry an
accessible name stating the format and the value.

#### Scenario: A maker puts a QR code on the asset page

- GIVEN the detail page of device `SN-40211` with a `code` widget, format `qr`, source `address`
- WHEN an employee opens the page
- THEN a QR code shows that encodes the page's own address
- AND scanning it with a phone opens that device's page
- AND Download as SVG saves the code

#### Scenario: A wrong EAN-13 is explained

- GIVEN a `code` widget with format `ean13` on a field holding `12345`
- WHEN the page renders
- THEN the widget says the value is not a valid EAN-13 code
- AND no barcode is drawn
