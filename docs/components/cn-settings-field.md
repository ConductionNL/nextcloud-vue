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
| `date`, `datetime-local` (also `datetime`, `date-time`), `email`, `url` | NcTextField of that input type; the value stays the text the input holds |
| `secret` | NcTextField, masked and replace-only; with `secretSet` it says a value is stored. With `clearable` and a stored value, a switch (`clearLabel`, default "Remove the stored value") emits `clear`; the host passes `clearing` and the input is disabled while it is on |
| `number` | NcTextField of type number (`min`, `max`) |
| `textarea` | NcTextArea (`rows`) |
| `boolean` | NcCheckboxRadioSwitch as a checkbox |
| `switch` | NcCheckboxRadioSwitch as a switch |
| `select`, `enum` | NcSelect with `inputLabel`; static `options`, or `optionsUrl` with `optionsPath`, `optionLabel`, `optionValue` and `optionDetail` (a value in brackets after the label) |
| `radio` | A fieldset named by the label with one NcCheckboxRadioSwitch radio per option; an option's `description` is a line under it |
| `lines` | NcTextArea, one entry per line (the host turns the list into lines and back) |
| `checkboxes` | A fieldset named by the label with one NcCheckboxRadioSwitch checkbox per option; the value is the list of checked values in option order. A `select` with `multiple: true` is an NcSelect that takes several values, the value again a list |
| `pairs` | A fieldset named by the label with one row per `{ key, value }` entry of the value: a key input (`keyLabel`, `keyMaxLength`), a value input (`valueLabel`, `valueType: 'number'`) and a remove button named after the key; an add button (`addLabel`) under the rows. With `valueSource: { register, schema, labelField?, valueField?, limit? }` the value is an NcSelect over those OpenRegister objects (value the object id, label `labelField`); when the register holds more than it read (default 1000), a line says only the first ones are listed |
| `heading` | The label as a subheading; holds no value |
| `status` | A read-only NcNoteCard with the host's `text` in its `tone`; holds no value |
| `action` | A button with the label, emitting `action`; the host passes `actionBusy` and `actionResult` (`{ type, text }`, drawn as a note under it). With `href` (and `target`) it is a link to that page instead and emits nothing |
| `image` | A preview tile (the image at the value's url, else `initials`) and a button that uploads a file to `uploadUrl` at once (`uploadField`, `uploadParams`, `uploadValuePath`, `previewUrl`), emitting `uploaded` `hideLabel: true` keeps the field's label for a screen reader only. |

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
| `clear` | `boolean` | A clearable secret's removal switch changed. |
| `action` | none | An `action` field's button was pressed. |
