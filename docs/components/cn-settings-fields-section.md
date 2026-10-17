# CnSettingsFieldsSection

A settings section declared as fields. It reads the app's settings, draws the fields in one to three columns, and saves them with one Save button for the section. Use it inside `CnAdminSettingsShell` (or any admin page) for a section that is only a form over the app's settings, so the app writes no load, save, dirty or validation code of its own.

```vue
<CnAdminSettingsShell app-id="myapp" app-name="My app">
  <CnSettingsFieldsSection
    app-id="myapp"
    name="Connection"
    description="Where the service lives and how to reach it."
    :columns="2"
    :fields="[
      { key: 'baseUrl', label: 'Server address', required: true, pattern: '^https://', patternMessage: 'Starts with https://' },
      { key: 'apiKey', label: 'API key', type: 'secret', hint: 'Stored encrypted; never shown again.' },
      { key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }] },
      { key: 'register', label: 'Register', type: 'select', optionsUrl: '/apps/openregister/api/registers', optionLabel: 'title', optionValue: 'id' },
      { key: 'retries', label: 'Retries', type: 'number', min: 0, max: 5 },
      { key: 'enabled', label: 'Enabled', type: 'switch' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ]" />
</CnAdminSettingsShell>
```

## Loading and saving

- It reads `GET url`, by default `/apps/<appId>/api/settings`, and takes each field's value from the answer (or from `valuesPath` in it). A dotted `key` reads a nested value.
- One Save button closes the section. It is on only while a field differs from what was loaded or last saved, and "Unsaved changes" shows beside it.
- Save checks the fields first. A required field left empty, a value that does not match `pattern`, or a number outside `min`/`max` is marked (`aria-invalid`), its message replaces its hint and is tied to the control, the first one takes focus, and nothing is sent.
- Then one request (`saveMethod`, default `PUT`) to `saveUrl` (default `url`) sends every field of the section by its key. The section says "Saved." or why it did not save, and emits `saved` or `save-error`.

## A secret

A `secret` field is replace-only. The stored value is never put in the input; when the settings hold one, the input says "Stored. Type a new value to replace it." The secret is sent only when something was typed, and after the save the input is empty again. A required secret that is already stored passes the check.

## Fields

| Key | Description |
|-----|-------------|
| `key` | Required. The setting's name; a dotted key reads a nested value. |
| `label` | The label, through the app's translate function. Every field has one; a select gets it through NcSelect's `inputLabel`. |
| `type` | `text` (default), `textarea`, `number`, `switch`, `select` or `secret`. |
| `hint` | A line under the field, tied to it for screen readers. |
| `placeholder` | Placeholder text. |
| `required`, `pattern`, `patternMessage`, `min`, `max` | The checks Save runs. |
| `options` | A select's options: strings, or `{ value, label }`. |
| `optionsUrl`, `optionsPath`, `optionLabel`, `optionValue` | A select whose options are read from an endpoint: the list (or the list at `optionsPath`, or under `results`), each option's label and value read by dotted path. |
| `rows` | A textarea's rows. |
| `default` | The value when the settings hold none. |
| `readOnly` | Shown, not editable. |
| `wide` | Spans every column. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | String | required | The section title. |
| `description` | String | `''` | The line under the title. |
| `docUrl` | String | `''` | A documentation link beside the title. |
| `wide` | Boolean | `false` | Span the whole settings grid in the board look. |
| `fields` | Array | required | The fields, see above. |
| `columns` | Number | `1` | Columns of the field grid: 1, 2 or 3. A narrow card stacks them. |
| `appId` | String | `''` | The app id, for the default url. |
| `url` | String | `''` | Where the settings are read. App-absolute or a full URL. |
| `saveUrl` | String | `''` | Where the section saves; defaults to `url`. |
| `saveMethod` | String | `'PUT'` | `PUT`, `POST` or `PATCH`. |
| `valuesPath` | String | `''` | A dotted path to the values in the read answer. |
| `saveLabel` | String | `''` | The Save button's label; defaults to "Save". |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `object` | The section saved; the payload is what was sent. |
| `save-error` | `Error` | The save failed. |

## Accessibility

- Every control has a visible label tied to it; a select through NcSelect's `inputLabel`.
- A hint or an error is tied to its control with `aria-describedby`; a failing field carries `aria-invalid`, and the first one takes focus after a failed Save.
- The notice after a save is a status message, an error an alert.
- In the board look the labels sit above the controls, like every board settings card.
