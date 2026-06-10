# safeImageSrc

URL validator for `<img :src>` bindings. Returns the input when the scheme is `https:` / `http:` or a safe `data:image/(png|jpeg|gif|webp);base64,...` inline image; otherwise returns the empty string.

Use this whenever a component renders a data-driven URL into an `<img>` tag. Without it, a malicious source can ship `data:text/html,...` or `javascript:...` and execute code on render.

## Signature

```js
import { safeImageSrc } from '@conduction/nextcloud-vue'

safeImageSrc('https://example.com/logo.png')             // -> 'https://example.com/logo.png'
safeImageSrc('data:image/png;base64,iVBOR...')           // -> 'data:image/png;base64,iVBOR...'
safeImageSrc('data:text/html,<script>alert(1)</script>') // -> ''
safeImageSrc('javascript:alert(1)')                      // -> ''
safeImageSrc('//attacker.com/x.png')                     // -> ''
safeImageSrc(null)                                       // -> ''
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `url` | `string \| null \| undefined` | The image URL to validate. |

## Returns

The original URL when safe, or the empty string `''` when not. An `<img>` with an empty `src` renders nothing, which is the desired inert fallback.

## Allowed inputs

- `https://...` and `http://...` absolute URLs
- Base64-encoded inline images: `data:image/png;base64,...`, `image/jpeg`, `image/jpg`, `image/gif`, `image/webp`

## Rejected inputs

- Any `data:` URI other than the four image MIME types above
- `javascript:`, `vbscript:`, and every other non-image scheme
- Protocol-relative URLs (`//host/x.png`)
- `null`, `undefined`, and the empty string

## Usage

```html
<img :src="safeImageSrc(member.avatar)" :alt="member.name">
```

## See also

- [`safeHref`](./safe-href.md) — the `:href` companion.
- [`safeSvgPath`](./safe-svg-path.md) — the SVG `d` companion.
