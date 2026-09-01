import GeneratedRef from './_generated/CnIconColorPicker.md'

# CnIconColorPicker

The Proton-Pass-style personalization block for a folder or vault: a row of color swatches and a searchable icon grid over the library's curated folder-customization catalogs, topped by a live preview of the chosen pair in the active theme.

Apps persist the **keys** the picker emits — a `FOLDER_COLORS` key such as `blue` and a `FOLDER_ICONS` key such as `briefcase` — never resolved values. Rendering goes back through `resolveFolderColor(key, theme)` and `resolveFolderIcon(key)`, so the tint follows a live light/dark flip (pair with `useCurrentTheme()` / `currentTheme()`) and an unknown key from a newer catalog degrades to the app's default glyph instead of breaking.

It is a controlled component: bind `icon` and `color` (both nullable) and listen to `update:icon` / `update:color`, or simply use `v-model:icon` and `v-model:color`. The leading "Default" cell in each group emits an explicit `null` — that is the whole reset story, so host dialogs need no separate Reset control and can persist the null to clear a stored value.

Not to be confused with `CnIconPicker` / `CnIconBrowser`, which select **string icon names** for manifest-driven dashboard surfaces. This component selects from the small curated personalization set and adds the color dimension.

## Usage

```vue
<CnIconColorPicker
  v-model:icon="customIcon"
  v-model:color="customColor"
  :fallback-icon="Safe"
  :translate="(s) => t('myapp', s)" />
```

`fallback-icon` is the app's default glyph (an imported MDI component): it fills the preview while no icon is picked and renders as the grid's "Default" cell. Without it, no back-to-default cell is offered.

## Labels and l10n

Every user-facing label — the "Color" / "Icon" group labels, "Default", "Search icons", and the color and icon names — passes through the `translate` prop, the same convention as `CnAppRoot`'s. The English source strings live in the catalogs (`FOLDER_COLORS[].label`, `FOLDER_ICONS[].label`), so a consuming app adds exactly those strings to its own l10n catalogs. The icon search matches the key, the English label, **and** the translated label.

## Keyboard navigation

Both groups use a roving tabindex (APG toolbar pattern): Tab enters and leaves each group in a single stop — parked on the current selection, or the Default cell — and Left/Right arrows step through the cells (wrapping), with Home/End jumping to the ends. In the icon grid, Up/Down move by one visual row. Swatches and icon cells both paint their own `:hover` / `:focus-visible` ring, so keyboard focus stays visible even under a host app's global `outline` reset.

## Rendering the stored keys

```vue
<component
  :is="resolveFolderIcon(folder.customIcon) ?? Safe"
  :size="18"
  :fill-color="resolveFolderColor(folder.customColor, currentTheme())" />
```

`resolveFolderColor` returns `null` for an unset/unknown key (the MDI components then keep the theme default), and tolerates a literal `#hex` value from hand-edited storage.

<GeneratedRef />
