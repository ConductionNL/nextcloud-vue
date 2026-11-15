# CnCodeWidget

A record as a code on a detail page: a QR code, a Code 128 or an EAN-13 barcode, drawn in the browser, so the value never leaves it, with a Download as SVG button. It is registered as the `code` widget type.

```json
{ "id": "device-label", "type": "code", "title": "Label",
  "content": { "format": "code128", "source": "field", "field": "serienummer" } }
```

## Content

| Key | Values | Description |
|-----|--------|-------------|
| `format` | `qr` (default), `code128`, `ean13` | The kind of code. |
| `source` | `field`, `address` | `field` reads a property of the record. `address` is the record's address, and works for QR only. |
| `field` | dot-path | The property that holds the value (`source: "field"`). |
| `url` | string | The record's address, with `@objectId` and `@object.<field>` tokens. A path is taken on this site. Without it, the page the reader is on is used. |
| `size` | number | The width of a QR code in pixels (default 160). |

Code 128 takes letters, digits and plain punctuation (code set B). EAN-13 takes twelve digits, to which the check digit is added, or thirteen digits with a correct check digit. When the value cannot be drawn, the widget says why instead.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The widget content above. |
| `objectId` | String \| Number | `''` | The record's id, for `@objectId`. |
| `objectData` | Object | `null` | The record, for `field` and `@object.<field>`. |

`encodeCode128`, `code128Values`, `encodeEan13` and `eanCheckDigit` in `utils/barcode1d.js` return the bar modules for hosts that draw their own.
