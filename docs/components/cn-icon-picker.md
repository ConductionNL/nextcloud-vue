# CnIconPicker

Select-plus-upload picker for the dashboard `icon` convention. The built-in `<select>` emits a registry key (e.g. `'Star'`); the optional file-upload reads a data URL, hands it to the injected `uploadFn`, and emits the returned URL. The upload transport is the consumer's — pass `uploadFn` (e.g. an app's resource upload); when omitted the upload control is hidden so the library carries no upload dependency.

Vue 2 v-model: `value` in, `input` out.

```vue
<CnIconPicker v-model="icon" :upload-fn="uploadDataUrl" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `String` | `null` | Current icon value — a registry key, a URL, or null (v-model). |
| `icons` | `Object` | `DASHBOARD_ICONS` | Icon registry to enumerate in the select (name → component). |
| `uploadFn` | `Function` | `null` | Injected upload transport `async (dataUrl) => ({ url })`. When null, the upload control is hidden. |
| `compact` | `Boolean` | `false` | Compact mode — render a small trigger button that opens the icon grid as a popover instead of an always-visible grid. Suited to table rows / tight inline layouts. |
| `clearable` | `Boolean` | `false` | Show a leading "None" tile that clears the selection (emits `null`). Off by default so existing pickers are unchanged. |

## Events

| Name | Description |
|------|-------------|
| `input` | Emitted with the new icon value (registry key, URL, or null). |

See also [CnDashboardIcon](./cn-dashboard-icon.md) for rendering, and the `DASHBOARD_ICONS` / `DEFAULT_ICON` / `getIconComponent` / `isCustomIconUrl` helpers.
