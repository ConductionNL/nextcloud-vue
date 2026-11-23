# CnScanField

A text field that can also be filled by scanning a code with the device camera: QR, Code 128 and EAN-13, read with the browser's own `BarcodeDetector` (no library). The camera starts only when Scan is pressed and stops once a code is read. Typing always works, so a handheld scanner that types, a browser without `BarcodeDetector` or a refused camera still fill the field. A browser without `BarcodeDetector` shows no Scan button.

```vue
<CnScanField v-model="serial" label="Serial number" :formats="['qr', 'code128']" />
```

On a manifest form page it is the `scan` field type, `{ "type": "scan", "formats": ["qr"] }` (see [CnFormPage](./cn-form-page.md#device-fields)). On an index page, `config.scan` puts one above the list (see [CnIndexPage](./cn-index-page.md)).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `null` | The code. |
| `label` | String | `''` | The field label. |
| `formats` | Array | `[]` | `qr`, `code128`, `ean13`; all three when empty. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| null` | The code, typed or scanned. |
| `scanned` | `string` | A code was read from the camera. |
