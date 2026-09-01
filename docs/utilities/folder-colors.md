# FOLDER_COLORS

The curated color palette for folder/vault personalization (the Proton Pass
pattern): 12 entries of `{ key, label, light, dark }`, where `key` is what
an app persists, `label` is the English source string for the app's own
l10n, and `light` / `dark` are the theme-variant hex values
[`resolveFolderColor`](./resolve-folder-color.md) picks between.

Rendered by [`CnIconColorPicker`](../components/cn-icon-color-picker.md) as
the swatch row. Each pair is the **same hue** at slightly different
lightness — Proton-toned mid-tones, a step darker for contrast on light
surfaces and a step brighter on dark ones — so a vault keeps its
recognizable color identity when the user flips the theme (a jest spec
pins the hue distance per pair). The matching low-alpha circle behind a
colored glyph comes from [`folderColorTint`](./folder-color-tint.md), which
derives it from the same hex.

```js
import { FOLDER_COLORS } from '@conduction/nextcloud-vue'

FOLDER_COLORS[0]
// { key: 'red', label: 'Red', light: '#c95555', dark: '#f19090' }
```

Keys are stable API: apps store them in their own backends, so an entry is
never renamed or removed — growing the palette is additive.
