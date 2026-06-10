# safeHref

URL scheme allowlist for `:href` bindings against user-controlled data.

Components that bind URLs coming from a backend (a register row, a manifest field, anything outside the developer's direct control) need to validate the scheme before rendering. Without it, a malicious value of `javascript:alert(1)` or `data:text/html,<script>...</script>` executes code when the user clicks the link.

`safeHref(url)` returns the URL when its scheme is safe (`https:` / `http:` / `mailto:`) or it is a same-origin root-relative path (`/path/...`). Every other input — including `javascript:`, `data:`, `vbscript:`, protocol-relative `//attacker.com`, malformed URLs, and `null` / `undefined` — collapses to `'#'`.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `url` | `string \| null \| undefined` | The URL to validate. |

## Usage

```js
import { safeHref } from '@conduction/nextcloud-vue'

safeHref('https://example.com')       // → 'https://example.com'
safeHref('/apps/files')                // → '/apps/files'
safeHref('mailto:info@example.com')    // → 'mailto:info@example.com'
safeHref('javascript:alert(1)')        // → '#'
safeHref('data:text/html,<h1>x</h1>')  // → '#'
safeHref('//attacker.com/x')           // → '#'
safeHref(null)                         // → '#'
```

Companion utilities for image and SVG bindings:

- [`safeImageSrc`](./safe-image-src.md) — `:src` allowlist for `<img>` bindings (HTTPS / HTTP / inline `data:image/*` only).
- [`safeSvgPath`](./safe-svg-path.md) — `:d` allowlist for `<path>` bindings.
