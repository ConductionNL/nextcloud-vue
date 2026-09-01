# resolveFolderColor

`resolveFolderColor(value, theme)` turns a stored
[`FOLDER_COLORS`](./folder-colors.md) key into the hex string for the given
theme (`'light'` or `'dark'`).

```js
import { resolveFolderColor, currentTheme } from '@conduction/nextcloud-vue'

resolveFolderColor('blue', 'light') // '#0064a3'
resolveFolderColor('blue', 'dark') // '#4fa8e6'
resolveFolderColor(null, 'light') // null — caller keeps its default
resolveFolderColor('#123456', 'dark') // '#123456' — literal hex passthrough
```

Pass [`currentTheme()`](./current-theme.md) as the theme inside a computed
and the resolved variant follows a live light/dark flip.

Resolution is fail-open by design: `null`, `''` and **unknown keys** all
resolve to `null`, so the caller falls back to the theme-default color —
an older frontend renders values written by a newer palette without
breaking, and a hand-edited literal `#hex` is passed through unchanged.
