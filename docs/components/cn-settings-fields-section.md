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

## Fields

| Key | Description |
|-----|-------------|
| `key` | Required. The setting's name; a dotted key reads a nested value. |
| `label` | The label, through the app's translate function. Every field has one; a select gets it through NcSelect's `inputLabel`. |
| `type` | `text` (default), `textarea`, `number`, `switch`, `select`, `secret` or `image`. |
| `url`, `valuePath` | Read this field from another endpoint, at this dotted path. |
| `saveUrl`, `saveMethod`, `saveKey`, `saveParams` | Save this field to another endpoint (default `url`, `POST`), under this key, with these static fields merged into the body (`{ setting: 'name' }`). |
| `uploadUrl`, `uploadField`, `uploadParams`, `uploadValuePath`, `previewUrl`, `uploadLabel`, `accept` | An image's upload, see above. |
| `initials`, `initialsFrom` | An image's initials when there is no image: a name, or the key of the field that holds one. |
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
