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

- It reads `GET url`, by default `/apps/<appId>/api/settings`, and takes each field's value from the answer (or from `valuesPath` in it). A key the answer holds as written wins, so a flat map with dotted keys (`integration.brk.mode`) reads as it is; otherwise a dotted `key` reads a nested value. A key is written as written.
- One Save button closes the section. It is on only while a field differs from what was loaded or last saved, and "Unsaved changes" shows beside it.
- Save checks the fields first. A required field left empty, a value that does not match `pattern`, or a number outside `min`/`max` is marked (`aria-invalid`), its message replaces its hint and is tied to the control, the first one takes focus, and nothing is sent.
- Then it sends the changed fields: one request per save target, each carrying that target's fields. Fields without a target of their own go to `saveUrl` (default `url`) with `saveMethod` (default `PUT`). The section says "Saved.", or why a target did not save (naming its fields when there are several targets), and emits `saved` or `save-error`. A target that failed keeps its fields unsaved, so the next Save sends only those.

## Fields of several apps

One section can hold settings that live in different apps, with no store in between: a field with its own `url` is read there (at `valuePath`, default its key) and saved to its own `saveUrl` (default that `url`), with `saveMethod` (default `POST`), under `saveKey` (default its key). Each distinct read target is read once. A target under `/ocs/` (a Nextcloud OCS API such as `/ocs/v2.php/cloud/capabilities?format=json`) is requested outside `index.php` with the `OCS-APIRequest` header. When a field's own target cannot be read, that field says so and is left out of the save; the rest of the section works.

```js
fields: [
  { key: 'orgName', label: 'Name of the organisation', url: '/apps/thematiq/settings/theming', valuePath: 'name', saveKey: 'name' },
  { key: 'appName', label: 'Name of the app for staff' },
  { key: 'theme', label: 'Theme', type: 'select', url: '/apps/thematiq/settings/theming', valuePath: 'tokenSet',
    saveUrl: '/apps/thematiq/settings/tokenset', saveKey: 'tokenSet',
    optionsUrl: '/apps/thematiq/settings/tokensets', optionLabel: 'label', optionValue: 'id' },
]
```

## An image

An `image` field shows the current image in a tile (its value is the image url), or up to two initials when there is none (`initials`, or the value of the field `initialsFrom` names). Its button uploads a chosen file at once, as multipart form data, to `uploadUrl`: the file under `uploadField` (default `image`) plus `uploadParams`. The new image url is read from the answer at `uploadValuePath`, or is `previewUrl` with a cache buster. An image is not part of Save. For the Nextcloud logo that is `uploadUrl: '/apps/theming/ajax/uploadImage'`, `uploadParams: { key: 'logo' }`, `uploadValuePath: 'data.url'`; the server only allows an administrator. `hideLabel: true` drops its visible label and keeps it for a screen reader.

## A secret

A `secret` field is replace-only. The stored value is never put in the input; when the settings hold one, the input says "Stored. Type a new value to replace it." The secret is sent only when something was typed, and after the save the input is empty again. A required secret that is already stored passes the check.

## Fields that depend on another, and stored text

- `visibleWhen: { key, equals }` (or `notEquals`, `in: [...]`, `empty: true`; a list of conditions must all hold) shows a field only while it holds. The key may be another field or any key in the values read. A hidden field is not checked on save.
- `default` stands in for a stored value that is missing or empty, so a fresh instance shows what the server uses.
- A switch reads `1`, `true`, `yes` and `on` as on. With `trueValue`/`falseValue` it saves those (`'1'`/`'0'`, `'true'`/`'false'`) instead of a boolean.
- A `secret` whose stored state the server answers under another key (`tokenSet: true`) names it with `setKey`.
- A `radio` field offers its options as radio buttons in a fieldset named by the label; an option's `description` is a line under it.
- A `lines` field edits a list one entry per line and saves it as a list without empty lines or repeats, or as JSON text with `saveAs: 'json'`.
- `integer: true` refuses a number with a fraction.

```js
fields: [
  { key: 'ai_enabled', label: 'Use AI', type: 'switch', trueValue: 'true', falseValue: 'false' },
  { key: 'ai_model_type', label: 'Model type', type: 'radio', options: [{ value: 'local', label: 'Local' }, { value: 'cloud', label: 'Cloud', description: 'Case data leaves the organisation.' }], visibleWhen: { key: 'ai_enabled', equals: true } },
  { key: 'ai_api_key', label: 'API key', type: 'secret', setKey: 'ai_api_key_set', visibleWhen: [{ key: 'ai_enabled', equals: true }, { key: 'ai_model_type', equals: 'cloud' }] },
  { key: 'trigger_words', label: 'Trigger words, one per line', type: 'lines', saveAs: 'json' },
]
```

## Lists, rows, a key of a JSON setting, and a scope

- A `checkboxes` field draws its `options` as checkboxes in a fieldset named by the label. Its value is the list of checked values, in option order. A `select` with `multiple: true` is the same as a multi-select. It saves a list, or JSON text with `saveAs: 'json'`, or comma text with `saveAs: 'csv'`, and reads any of the three back. `required` refuses an empty choice.
- A `pairs` field edits key-to-value rows: a key input (`keyLabel`, `keyMaxLength`), a value input (`valueLabel`; `valueType: 'number'` for a number), a remove button per row and an add button (`addLabel`). It saves the rows that have a key as one object, or JSON text with `saveAs: 'json'`. It refuses a key that appears twice, a key that fails `pattern` (with `patternMessage`), and with `valueAbove` a value that is not above it (with `valueMessage`).
- `path: 'vat_rates.high'` edits one key inside a JSON-valued setting. A save sends the whole setting back: the value read, with every field of the section whose `path` lies in it set from the form, as JSON text when it was read as text.
- A field with `scope: true` picks which record the section edits. Its value (its `default` until changed) fills `{key}` in `url`, `saveUrl` and the fields' urls, and a change reads the section again. It is never saved and never makes the section dirty.

```js
fields: [
  { key: 'tenantId', label: 'Tenant', type: 'select', scope: true, default: 'default', optionsUrl: '/apps/myapp/api/tenants' },
  { key: 'tabs', label: 'Tabs shown', type: 'checkboxes', options: [{ value: 'cases', label: 'Cases' }, { value: 'invoices', label: 'Invoices' }] },
  { key: 'exchange_rates', label: 'Exchange rates', type: 'pairs', keyLabel: 'Currency', valueLabel: 'Rate', valueType: 'number', keyMaxLength: 3, saveAs: 'json' },
  { key: 'vatHigh', path: 'vat_rates.high', label: 'High rate (%)', type: 'number', min: 0, max: 100, default: 21 },
]
// with url: '/apps/myapp/api/tenant-config?tenantId={tenantId}'
```

## Notes, headings and actions

Three types hold no value of their own; they are never checked or saved.

- `heading` draws its `label` as a subheading between fields.
- `status` draws a read-only note. Its text is `text`, or its `textMap` entry for the value read at its key (`'*'` for any other value; with neither, the value itself). `{name}` takes the value of that field or of that key in the values read, `{value}` the field's own. Its tone is `tone` or its `toneMap` entry (`info` by default; `warning` and `error` are announced as alerts). A note whose text is empty is not drawn, so `textMap: { '': '' }` hides it while nothing is wrong.
- `action` draws a button with its `label`. It posts the fields named in `send` to `url` with `method` (default `POST`) and shows the answer's sentence at `resultPath` (default `message`, else `successText`, or `failureText` when `okPath` reads false, with `{name}` filled from the answer, else "Done."), as an error when `okPath` reads false. A failed request shows the server's own sentence. With `fill: { key, bytes }` it puts a random hexadecimal value of that many bytes (default 32) in that field instead, to be saved with the section. With `href` it is a link to a page (`target: '_blank'` opens a new tab) and posts nothing. With `confirm` it asks first (the question's text, `confirmLabel` for the button) and posts only after a yes; `params` are sent with it, such as `{ confirm: 'true' }`.
- A `secret` with `clearable` offers "Remove the stored value" while a value is stored. Switched on, the input is disabled and the save sends `clearKey: true` (for a server that takes a flag, such as `clearToken`), or the key with an empty value when there is no `clearKey`.
- A `pairs` field with `valueSource: { register, schema, labelField }` chooses each value from those OpenRegister objects and saves their ids.

```js
fields: [
  { key: 'reason', type: 'status', textMap: { disabled: 'The account {userId} is disabled.', '*': '' }, toneMap: { '*': 'warning' }, visibleWhen: { key: 'usable', equals: false } },
  { key: 'userId', label: 'Nextcloud user name' },
  { key: 'test', label: 'Test connection', type: 'action', url: '/apps/myapp/api/health', okPath: 'healthy' },
]
```

## Fields

| Key | Description |
|-----|-------------|
| `key` | Required. The setting's name; a dotted key reads a nested value. |
| `label` | The label, through the app's translate function. Every field has one; a select gets it through NcSelect's `inputLabel`. |
| `type` | `text` (default), `textarea`, `number`, `switch`, `select`, `radio`, `checkboxes`, `pairs`, `lines`, `secret`, `password`, `image`, `heading`, `status` or `action`. |
| `url`, `valuePath` | Read this field from another endpoint, at this dotted path. |
| `saveUrl`, `saveMethod`, `saveKey`, `saveParams` | Save this field to another endpoint (default `url`, `POST`), under this key, with these static fields merged into the body (`{ setting: 'name' }`). |
| `uploadUrl`, `uploadField`, `uploadParams`, `uploadValuePath`, `previewUrl`, `uploadLabel`, `accept` | An image's upload, see above. |
| `initials`, `initialsFrom` | An image's initials when there is no image: a name, or the key of the field that holds one. |
| `hint` | A line under the field, tied to it for screen readers. |
| `placeholder` | Placeholder text. |
| `required`, `pattern`, `patternMessage`, `min`, `max` | The checks Save runs. |
| `options` | A select's options: strings, or `{ value, label }`. |
| `optionsUrl`, `optionsPath`, `optionLabel`, `optionValue`, `optionDetail` | A select whose options are read from an endpoint: the list (or the list at `optionsPath`, or under `results`), each option's label and value read by dotted path; `optionDetail` adds a value in brackets after the label when the option has one (`Team (team@example.org)`). |
| `foldable` | A status note that folds away with the hints under `hintsToggle`. |
| `rows` | A textarea's rows. |
| `default` | The value when the settings hold none, or an empty one. |
| `visibleWhen` | Show the field only while this condition holds, see above. |
| `trueValue`, `falseValue` | What a switch saves for on and off. |
| `setKey` | The key that says a secret is stored. |
| `saveAs` | `'json'`: a lines, multi-choice or pairs field saves JSON text; `'csv'`: a multi-choice field saves comma text. |
| `multiple` | A select that takes several values, saved as a list. |
| `keyLabel`, `valueLabel`, `valueType`, `keyMaxLength`, `addLabel`, `valueAbove`, `valueMessage`, `valueSource` | A pairs field's inputs, add button, value check, and the objects its values are chosen from. |
| `path` | `setting.key`: edit one key inside a JSON-valued setting. |
| `scope` | The value fills `{key}` in the urls and reloads the section; never saved. |
| `integer` | A number must be whole. |
| `text`, `textMap`, `tone`, `toneMap` | A status note's text and tone. |
| `method`, `send`, `resultPath`, `okPath`, `successText`, `failureText`, `fill`, `href`, `target`, `confirm`, `confirmLabel`, `params` | An action, see above. |
| `clearable`, `clearKey`, `clearLabel` | A secret whose stored value can be removed. |
| `readOnly` | Shown, not editable. |
| `wide` | Spans every column. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | String | required | The section title. |
| `description` | String | `''` | The line under the title. |
| `detailedDescription` | String | `''` | A longer explanation in its own block under the title. |
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
| `savedMessage` | String | `''` | The note after a save, `{name}` filled from the fields and the values read; defaults to "Saved.". |
| `reloadAfterSave` | Boolean | `false` | Read the values again after a save, for status notes the server works out. |
| `saveAll` | Boolean | `false` | Send every field on a save, not only the changed ones, for an endpoint that replaces the whole record. |
| `hintsToggle` | Boolean | `false` | Fold the hints, and status notes marked `foldable`, behind one "Show the explanations" button. |
| `autoSave` | Boolean | `false` | Save each change at once (typed text after a pause), with no Save button. |
| `bare` | Boolean | `false` | No card, title or description, for a host that gives the section its own (a settings dialog section). Loading and a failed read still show. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `object` | The section saved; the payload is what was sent. |
| `save-error` | `Error` | The save failed. |

## Accessibility

- Every control has a visible label tied to it; a select through NcSelect's `inputLabel`.
- A hint or an error is tied to its control with `aria-describedby`; a failing field carries `aria-invalid`, and the first one takes focus after a failed Save.
- The notice after a save is a status message, an error an alert. A status note in the `warning` or `error` tone is an alert too.
- Radio choices and checkboxes sit in a fieldset whose legend is the label; an option's description is drawn next to it.
- A pairs row's inputs carry their own labels, and its remove button is named after the row's key.
- In the board look the labels sit above the controls, like every board settings card.
