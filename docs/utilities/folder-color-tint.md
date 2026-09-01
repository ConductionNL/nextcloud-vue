# folderColorTint

`folderColorTint(value, theme, alpha = 0.15)` returns the Proton-style
**tint** of a stored [`FOLDER_COLORS`](./folder-colors.md) key: the resolved
theme hex as an `rgba()` string at low alpha, for the circle behind a
colored vault glyph (and `CnIconColorPicker`'s preview).

```vue
<span :style="{ backgroundColor: folderColorTint(folder.customColor, currentTheme()) }">
  <component
    :is="resolveFolderIcon(folder.customIcon) ?? Safe"
    :fill-color="resolveFolderColor(folder.customColor, currentTheme())" />
</span>
```

The tint is **derived from the same hex** the glyph uses — never a second
palette — so glyph and circle can never disagree, in either theme. That is
the approach the original folder-customization work (53a36006) took with
`hexToRgba(hex, 0.12)`.

Returns `null` for an unset or unknown key, so the caller keeps its neutral
chrome. Pass a custom `alpha` for stronger emphasis (the reference used
0.28 for an active row).
