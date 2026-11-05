# encodeQr

Encodes a text as a QR code in the browser. It needs no library and sends nothing to a QR service: byte mode, error correction level M, versions 1 to 20 (up to 666 bytes of UTF-8). [`CnQrCode`](../components/cn-qr-code.md) draws its symbol with it.

## Import

```js
import { encodeQr } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function encodeQr(text: string): { version: number, size: number, modules: boolean[][] } | null
```

| Name | Type | Description |
|------|------|-------------|
| `text` | `string` | The text to encode, any Unicode. |

It returns the smallest version that holds the text:

- `version`: the QR version, 1 to 20.
- `size`: the number of modules on each side (`17 + 4 * version`).
- `modules`: `size` rows of `size` booleans, `true` for a dark module.

It returns `null` when the text is empty or longer than version 20 holds. The quiet zone around the symbol is not part of `modules`; the caller draws it.

## Usage

```js
import { encodeQr } from '@conduction/nextcloud-vue'

const symbol = encodeQr('https://example.org/case/123')
if (symbol) {
	// one <rect> per dark module, on a viewBox of the symbol size plus a 4-module quiet zone
	const cells = symbol.modules.flatMap((row, y) => row.map((dark, x) => (dark ? { x, y } : null))).filter(Boolean)
}
```
