---
sidebar_position: 22
---

# CnPropertyValueCell

The cell renderer used inside [`CnPropertiesTab`](cn-properties-tab.md) for a single property's value. Picks an appropriate input/display widget from the schema (with optional explicit override) and emits committed values back to the parent.

Exposed publicly so consumers using a custom `value-cell` scoped slot on `CnPropertiesTab` can fall back to the default rendering for properties they don't want to handle themselves.

**Wraps**: `NcTextField`, `NcTextArea`, `NcCheckboxRadioSwitch`, `NcDateTimePickerNative`, `NcSelect`

---

## Widgets

| Widget | When auto-detected | Notes |
|--------|--------------------|-------|
| `text` | string (default) | `NcTextField`. The `type` attribute follows the string `format` — see the format table below. |
| `number` | `type: 'number'` or `'integer'` | `NcTextField` (`type="number"` with `min`/`max`/`step` from schema). Emits parsed numbers (or `null` for empty). |
| `boolean` | `type: 'boolean'` | `NcCheckboxRadioSwitch` (always rendered as a switch — no row-click required to edit). |
| `datetime` | `type: 'string'` with `format` of `date`, `time`, or `date-time` | `NcDateTimePickerNative`. |
| `textarea` | `type: 'string'` with `format: 'text'` or `format: 'html'` | `NcTextArea` with configurable `rows`. |
| `array` | `type: 'array'` | `NcTextField` with comma-separated values. Emits an array on update (`split(/ *, */g)` + `filter(Boolean)`). |
| `object` | `type: 'object'` | `CnJsonViewer` (CodeMirror) editor for JSON. Emits the parsed object on commit; if the input is invalid JSON, the raw string is emitted unchanged so the user keeps their work and `CnJsonViewer` shows a parse error inline. Empty input emits `null`. |
| `select` | _(never auto-detected — must be set via `widget` prop)_ | `NcSelect` with `options`. Emits raw IDs (single value or array, depending on `selectMultiple`). |

### String `format` → input `type` mapping

For the `text` widget the cell maps the schema's `format` to a sensible HTML5 input type:

| `format` value(s) | Input `type` |
|-------------------|--------------|
| `email`, `idn-email` | `email` |
| `url`, `uri`, `uri-reference`, `iri`, `iri-reference`, `uri-template`, `accessUrl`, `shareUrl`, `downloadUrl` | `url` |
| `password` | `password` |
| `telephone` | `tel` |
| `color`, `color-hex`, `color-hex-alpha` | `color` |
| `date` / `time` / `date-time` | (handled by the `datetime` widget — not a plain text input) |
| anything else (`hostname`, `ipv4`, `uuid`, `regex`, `bsn`, `kvk`, `semver`, …) | `text` |

Use the `widget` prop to override the auto-detection — e.g. when a property's options come from a runtime collection (`select`) or when you want a textarea for a property whose schema doesn't carry `format: 'text'`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `propertyKey` | String | _required_ | The schema property key. |
| `schema` | Object | `null` | Full JSON schema. Used to derive the active widget when `widget` is not set. |
| `value` | * | `null` | The resolved current value (`formData[key] ?? item[key]`). |
| `isEditable` | Boolean | `true` | When `false`, the cell renders display-only. |
| `isEditing` | Boolean | `false` | When `true` (and `isEditable`), the cell renders an input — except for `boolean`, which always renders the switch. |
| `displayName` | String | `''` | Human-readable label used as placeholder/aria-label. |
| `editabilityWarning` | String | `null` | Tooltip/title on the display element when not editable. |
| `widget` | String | `null` | Explicit widget override. One of `text`, `number`, `boolean`, `datetime`, `textarea`, `array`, `select`, `object`. |
| `selectOptions` | Array | `null` | Options for the `select` widget. Each entry may be a primitive or `{ id, label }`. |
| `selectMultiple` | Boolean | `true` | Whether the `select` widget allows multiple values. |
| `textareaRows` | Number | `4` | Row count for the `textarea` widget. |
| `objectEditorHeight` | String | `'300px'` | CSS height passed to the `object` widget's CodeMirror editor. |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:value` | `value` | The new committed value. For `array`/`select` the payload is already an array of primitives; for `number`/`integer` it is parsed (or `null`). |

---

## Public methods

| Method | Description |
|--------|-------------|
| `focus()` | Focus the underlying input/textarea (no-op for widgets without a focusable element). Called by `CnPropertiesTab` when a row is selected. |

---

## Usage inside a custom `value-cell` slot

```vue
<CnPropertiesTab
  :schema="schema"
  :item="item"
  :form-data="formData"
  :selected-property="selectedProperty"
  @update:selected-property="selectedProperty = $event"
  @update:property-value="onPropertyValueUpdate">
  <template #value-cell="{ propertyKey, resolvedValue, isEditing, isEditable, displayName, schemaProp, onUpdate }">
    <!-- Render Toast UI for markdown fields, fall back to default cell otherwise -->
    <MyMarkdownEditor
      v-if="schemaProp && schemaProp.format === 'markdown' && isEditing"
      :value="String(resolvedValue || '')"
      @update:value="onUpdate" />
    <CnPropertyValueCell
      v-else
      :property-key="propertyKey"
      :schema="schema"
      :value="resolvedValue"
      :is-editable="isEditable"
      :is-editing="isEditing"
      :display-name="displayName"
      @update:value="onUpdate" />
  </template>
</CnPropertiesTab>
```
