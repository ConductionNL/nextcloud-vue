# safeImageSrc

URL scheme allowlist for `:src` bindings on `<img>` elements.

Returns the URL when its scheme is `https:` or `http:`, OR when it is a base64-encoded inline image data URI (`data:image/png;base64,…`, `data:image/jpeg;base64,…`, `data:image/gif;base64,…`, `data:image/webp;base64,…`). Every other input collapses to `''` so the `<img>` renders no source rather than an attacker-controlled URL.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `url` | `string \| null \| undefined` | The image URL to validate. |

## Usage

```js
import { safeImageSrc } from '@conduction/nextcloud-vue'

safeImageSrc('https://example.com/logo.png')             // → 'https://example.com/logo.png'
safeImageSrc('data:image/png;base64,iVBOR…')             // → 'data:image/png;base64,iVBOR…'
safeImageSrc('data:text/html,<script>alert(1)</script>') // → ''
safeImageSrc('javascript:alert(1)')                       // → ''
safeImageSrc('//attacker.com/x.png')                      // → ''
safeImageSrc(null)                                         // → ''
```

For `<a :href>` use [`safeHref`](./safe-href.md). For SVG `<path :d>` use [`safeSvgPath`](./safe-svg-path.md).
