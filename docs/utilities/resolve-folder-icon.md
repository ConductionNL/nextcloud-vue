# resolveFolderIcon

`resolveFolderIcon(key)` turns a stored [`FOLDER_ICONS`](./folder-icons.md)
key into its MDI icon component, or `null` for an unset or unknown key —
the caller then falls back to its default glyph.

```vue
<component
  :is="resolveFolderIcon(folder.customIcon) ?? Safe"
  :size="18"
  :fill-color="resolveFolderColor(folder.customColor, currentTheme())" />
```

The `null`-for-unknown contract is what keeps older frontends
forward-compatible with keys written by a newer catalog: nothing throws,
the default glyph renders, and the stored value survives untouched.
