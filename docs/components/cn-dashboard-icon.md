# CnDashboardIcon

Renders an icon for any value following the dashboard `icon` convention: a registry key → the built-in MDI component, a URL → an `<img>`, or null/empty/unknown → the default icon. Pair with [CnIconPicker](./cn-icon-picker.md) for selection.

```vue
<CnDashboardIcon :name="dashboard.icon" :size="24" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `String` | `null` | Icon identifier — a registry key (e.g. `'Star'`), a URL (rendered as `<img>`), or null/empty for the default icon. |
| `size` | `Number` | `20` | Icon size in pixels (`size` on MDI components, `width`/`height` on `<img>`). |
| `alt` | `String` | `null` | Alt text for URL icons; falls back to `'icon'`. Ignored for decorative MDI icons. |
