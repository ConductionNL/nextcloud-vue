# safeSvgPath

Character allowlist for SVG `<path :d>` bindings.

Limits the input string to the characters used by SVG path commands: command letters (`M m L l H h V v C c S s Q q T t A a Z z`), digits, decimal points, commas, whitespace, the minus sign for negative coordinates, and `e` / `E` for scientific notation in arc radii. Any other character — including embedded angle brackets, quotes, slashes, or unicode trickery — rejects the entire string to `''` so the `:d` binding receives an inert value.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `pathData` | `string \| null \| undefined` | The SVG path `d` value to validate. |

## Usage

```js
import { safeSvgPath } from '@conduction/nextcloud-vue'

safeSvgPath('M12 2 L20 20 Z')   // → 'M12 2 L20 20 Z'
safeSvgPath('M0,0 -3.5e2,12 Z') // → 'M0,0 -3.5e2,12 Z'
safeSvgPath('M0,0<script>')     // → ''
safeSvgPath(null)               // → ''
```

For `<a :href>` use [`safeHref`](./safe-href.md). For `<img :src>` use [`safeImageSrc`](./safe-image-src.md).
