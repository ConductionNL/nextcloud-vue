---
sidebar_position: 13
---

# CnJsonViewer

Syntax-highlighted JSON viewer and editor powered by CodeMirror 6. Automatically detects the Nextcloud theme (light/dark) and applies matching syntax colors.

Use **read-only mode** to display JSON data with syntax highlighting in detail views, audit logs, or API response previews. Use **editable mode** for JSON input fields with live validation and formatting.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | String | `''` | The JSON string to display or edit. Use `.sync` or `@update:value` for two-way binding. |
| `readOnly` | Boolean | `false` | When `true`, the editor is non-editable and the format button and validation error are hidden. |
| `height` | String | `'300px'` | CSS height for the editor container (e.g. `'200px'`, `'50vh'`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:value` | `string` | Emitted when the content changes (editable mode) or after formatting. Use with `.sync` for two-way binding. |
| `format` | `object` | Emitted after a successful format with the parsed JSON object. |

## Usage

### Read-only JSON display

The most common use case — display JSON data with syntax highlighting in a detail view or modal:

```vue
<CnJsonViewer
  :value="JSON.stringify(apiResponse, null, 2)"
  :read-only="true" />
```

### Read-only with custom height

Control the viewer height for shorter or taller content:

```vue
<CnJsonViewer
  :value="jsonString"
  :read-only="true"
  height="150px" />
```

### Editable JSON input

Use as a JSON editor with two-way binding. Shows a "Format JSON" button and inline validation:

```vue
<CnJsonViewer
  :value.sync="formData"
  @format="onFormatted" />
```

When the JSON is invalid, a red "Invalid JSON format" message appears below the editor.

### In a dialog or modal

Combine with other components in a dialog to show structured data:

```vue
<NcDialog name="API Response" size="large">
  <CnJsonViewer
    :value="JSON.stringify(response, null, 2)"
    :read-only="true"
    height="400px" />
</NcDialog>
```

### Pre-formatting data before display

CnJsonViewer expects a JSON **string**. If your data is an object or might be a compact JSON string, format it before passing:

```vue
<script>
computed: {
  formattedData() {
    if (!this.rawData) return ''
    try {
      const parsed = typeof this.rawData === 'string'
        ? JSON.parse(this.rawData)
        : this.rawData
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(this.rawData)
    }
  }
}
</script>

<template>
  <CnJsonViewer :value="formattedData" :read-only="true" />
</template>
```

## Behavior

- **Theme detection**: Automatically uses the One Dark theme when the Nextcloud dark mode is active. No manual `dark` prop needed.
- **Read-only mode**: Hides the "Format JSON" button and validation error. The editor content is selectable but not editable.
- **Editable mode**: Shows a "Format JSON" button that pretty-prints the content with 2-space indentation. Shows an "Invalid JSON format" error when the content cannot be parsed.
- **Syntax highlighting**: JSON keys, strings, numbers, booleans, and null values are color-coded.
- **Scrollable**: The editor scrolls when content exceeds the configured height.
