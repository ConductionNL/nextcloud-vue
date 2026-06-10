# safeSvgPath

Allowlist validator for SVG `<path :d="…">` bindings. Returns the input when it contains only SVG path command characters; otherwise returns the empty string.

Use this whenever a component renders a data-driven string into an SVG `d` attribute. The empty fallback yields an inert path rather than an attacker-controlled one.

## Signature

```js
import { safeSvgPath } from '@conduction/nextcloud-vue'

safeSvgPath('M12 2 L20 20 Z')   // -> 'M12 2 L20 20 Z'
safeSvgPath('M0,0<script>')     // -> ''
safeSvgPath(null)               // -> ''
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `pathData` | `string \| null \| undefined` | The SVG path `d` value. |

## Returns

The original string when valid, or the empty string `''` when not.

## Allowed character set

- SVG path command letters: `M m L l H h V v C c S s Q q T t A a Z z`
- Digits, decimal point (`.`), comma (`,`), whitespace
- Minus (`-`) for negative coordinates
- `e` / `E` for scientific notation in arc radii

Any character outside this set fails the validator, including the `<` / `>` brackets that would let an attacker break out of the attribute.

## Rejected inputs

- Strings containing markup-style characters (`<`, `>`, `"`, etc.)
- Unicode trickery / non-ASCII characters
- `null`, `undefined`, and the empty string

## Usage

```html
<svg viewBox="0 0 24 24">
  <path :d="safeSvgPath(icon.d)" />
</svg>
```

## See also

- [`safeHref`](./safe-href.md) — the `:href` companion.
- [`safeImageSrc`](./safe-image-src.md) — the `<img src>` companion.
