---
sidebar_position: 13
---

# CnJsonViewer

Syntax-highlighted code viewer and editor powered by CodeMirror 6. Supports JSON, XML, HTML, and plain text with automatic language detection. Automatically detects the Nextcloud theme (light/dark) and applies matching syntax colors.

Use **read-only mode** to display structured data with syntax highlighting in detail views, audit logs, or API response previews. Use **editable mode** for JSON input fields with live validation and formatting.

This component also backs the `json` and `code` widgets of [`CnFormDialog`](cn-form-dialog.md), so schema-driven forms get a rich JSON/code editor for free — you rarely need to embed `CnJsonViewer` directly inside a form.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | String | `''` | The code string to display or edit. Use `.sync` or `@update:value` for two-way binding. |
| `readOnly` | Boolean | `false` | When `true`, the editor is non-editable and the format button and validation error are hidden. |
| `height` | String | `'300px'` | CSS height for the editor container (e.g. `'200px'`, `'50vh'`). |
| `language` | String | `'auto'` | Content language for syntax highlighting. See [Language modes](#language-modes) below. |
| `errorText` | String | `null` | Custom text for the error banner below the editor. `null` keeps the built-in behavior (renders "Invalid JSON format" when `language === 'json'` and content fails to parse). Any string lets the caller own the banner — rendered when non-empty, hidden when empty — useful for surfacing richer parse errors. |

## Language Modes

| Value | Description |
|-------|-------------|
| `'auto'` | **Default.** Auto-detects the language from content: tries JSON parse first, then checks for HTML (doctype or common tags like `<html>`, `<div>`, `<script>`, etc.), then falls back to XML for other tag-based content, and finally plain text. |
| `'json'` | JSON with syntax highlighting, validation error display, and a "Format JSON" button (in editable mode). |
| `'xml'` | XML with tag and attribute highlighting. |
| `'html'` | HTML with full support for embedded JavaScript and CSS syntax highlighting. |
| `'text'` | Plain text with no syntax highlighting. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:value` | `string` | Emitted when the content changes (editable mode) or after formatting. Use with `.sync` for two-way binding. |
| `format` | `object` | Emitted after a successful format with the parsed JSON object. Only relevant in JSON mode. |
| `detected-language` | `string` | Emitted with the resolved language (`'json'`, `'html'`, `'xml'`, or `'text'`) whenever it changes — including once on mount. When `language` is set explicitly the payload mirrors that prop; in `'auto'` mode it reports the detection result. |

## Usage

### Read-only JSON display

The most common use case — display JSON data with syntax highlighting in a detail view or modal:

```vue
<CnJsonViewer
  :value="JSON.stringify(apiResponse, null, 2)"
  :read-only="true" />
```

### Auto-detect language from content

Let the component detect whether content is JSON, HTML, XML, or plain text:

```vue
<CnJsonViewer
  :value="responseBody"
  :read-only="true"
  language="auto" />
```

This is the default behavior — `language="auto"` can be omitted.

### Explicit XML mode

Force XML highlighting regardless of content:

```vue
<CnJsonViewer
  :value="xmlString"
  :read-only="true"
  language="xml" />
```

### HTML with embedded scripts and styles

Display HTML responses with full syntax highlighting for inline `<script>` and `<style>` blocks:

```vue
<CnJsonViewer
  :value="htmlResponse"
  :read-only="true"
  language="html" />
```

### Plain text mode

Disable all syntax highlighting:

```vue
<CnJsonViewer
  :value="logOutput"
  :read-only="true"
  language="text" />
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

When the JSON is invalid, a red "Invalid JSON format" message appears below the editor. The format button and validation are only shown in JSON mode.

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

CnJsonViewer expects a **string**. If your data is an object or might be a compact JSON string, format it before passing:

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

- **Theme detection**: Automatically uses the GitHub Dark theme when the Nextcloud dark mode is active, and GitHub Light otherwise. No manual `dark` prop needed.
- **Language auto-detection**: When `language="auto"` (default), the component inspects the content in order: valid JSON → HTML (by doctype or common HTML tags) → XML (any tag-based content) → plain text.
- **Read-only mode**: Hides the "Format JSON" button and validation error. The editor content is selectable but not editable.
- **Editable mode** (JSON only): Shows a "Format JSON" button that pretty-prints the content with 2-space indentation. Shows an "Invalid JSON format" error when the content cannot be parsed.
- **Syntax highlighting**: Supports JSON (keys, strings, numbers, booleans, null), XML (tags, attributes), and HTML (tags, attributes, embedded JS/CSS).
- **Scrollable**: The editor scrolls when content exceeds the configured height.
