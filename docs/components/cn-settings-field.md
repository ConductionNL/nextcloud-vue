# CnSettingsField

One settings field: the control for its type with its label, and under it an error or a hint, tied to the control. `CnSettingsPage` renders its fields with it, and `CnSettingsFieldsSection` builds on it.

```vue
<CnSettingsField
  :field="{ key: 'apiKey', label: 'API key', type: 'secret', secretSet: true }"
  v-model="form.apiKey"
  hint="Never shown again." />
```

| Type | Control |
|------|---------|
| `text` (default), `string` | NcTextField |
| `password` | NcTextField, masked, showing its value back |
| `secret` | NcTextField, masked and replace-only; with `secretSet` it says a value is stored |
| `number` | NcTextField of type number (`min`, `max`) |
| `textarea` | NcTextArea (`rows`) |
| `boolean` | NcCheckboxRadioSwitch as a checkbox |
| `switch` | NcCheckboxRadioSwitch as a switch |
| `select`, `enum` | NcSelect with `inputLabel`; static `options`, or `optionsUrl` with `optionsPath`, `optionLabel` and `optionValue` |
| `image` | A preview tile (the image at the value's url, else `initials`) and a button that uploads a file to `uploadUrl` at once (`uploadField`, `uploadParams`, `uploadValuePath`, `previewUrl`), emitting `uploaded` |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | Object | required | The field: `{ key, label, type?, options?, optionsUrl?, optionsPath?, optionLabel?, optionValue?, placeholder?, rows?, min?, max?, required?, readOnly?, secretSet? }`. The label arrives translated. |
| `modelValue` | any | `null` | The value. |
| `error` | String | `''` | A validation message under the control. |
| `hint` | String | `''` | A hint under the control, not drawn while there is an error. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | value | The value changed. |
| `uploaded` | `string` | An image was uploaded; the payload is its new url. |
