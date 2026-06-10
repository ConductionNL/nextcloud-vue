# safeHref

URL scheme validator for `:href` bindings. Returns the input URL when the scheme is safe (`https:`, `http:`, `mailto:`, or a same-origin relative path starting with `/`); otherwise returns `'#'`.

Use this whenever a component renders a data-driven URL into an anchor tag. Without it, a malicious source can ship `javascript:alert(1)` or `data:text/html,...` and execute code on click.

## Signature

```js
import { safeHref } from '@conduction/nextcloud-vue'

safeHref('https://example.com')        // -> 'https://example.com'
safeHref('/apps/files')                // -> '/apps/files'
safeHref('mailto:info@example.com')    // -> 'mailto:info@example.com'
safeHref('javascript:alert(1)')        // -> '#'
safeHref('data:text/html,<h1>x</h1>')  // -> '#'
safeHref('//attacker.com/x')           // -> '#'
safeHref(null)                         // -> '#'
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `url` | `string \| null \| undefined` | The URL to validate. |

## Returns

The original URL when safe, or the literal `'#'` when not.

## Allowed inputs

- `https://...` and `http://...` absolute URLs
- `mailto:...` links
- Same-origin paths starting with a single `/` (rejects `//host/x`, which is protocol-relative)

## Rejected inputs

- `javascript:`, `data:`, `vbscript:`, and every other unrecognised scheme
- Protocol-relative URLs (`//attacker.com/x`)
- `null`, `undefined`, and the empty string

## Usage

```html
<a :href="safeHref(item.url)" target="_blank" rel="noopener">{{ item.label }}</a>
```

## See also

- [`safeImageSrc`](./safe-image-src.md) — the `<img src>` companion.
- [`safeSvgPath`](./safe-svg-path.md) — the SVG `d` companion.
