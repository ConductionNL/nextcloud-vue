# CnFileField

A form field that reads one file the user picks and hands back its content.

```vue
<CnFileField
  v-model="form.report"
  :label="t('myapp', 'Advice report')"
  accept=".pdf,.docx" />
```

`cnRenderFormField` renders it for a manifest field of `type: "file"`, so a `type: "form"` page gets it without any code. See [CnFormPage](./cn-form-page.md#file-fields).

## The value is content, never a location

The field emits the picked file as a `data:` URL, built by `FileReader` in the browser. It never takes, builds or emits a path or a URL.

That is the security property. The field cannot decide where a file is stored, so a manifest cannot use it to write somewhere the host did not intend. The receiver of the value decides. OpenRegister, for a schema property of `type: "file"`, stores the content in the object's own folder under a name it generates. It checks the property's allowed types and size limit first, and refuses executable content.

Nothing is uploaded when a file is picked. The content travels with the form when the form is submitted, so a cancelled form writes nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `String`, `Object`, `Number` | `null` | A `data:` URL for a file picked here, an existing file as the server rendered it, or `null`. |
| `label` | `String` | `''` | Visible label. It also names the group the buttons sit in. |
| `accept` | `String` | `''` | File types the picker offers, in HTML `accept` syntax: `.pdf`, `application/pdf`, `image/*`. Empty accepts any type. |
| `maxSize` | `Number` | `1048576` | Largest file the field reads, in bytes. |
| `disabled` | `Boolean` | `false` | Whether the field is read-only. |
| `helperText` | `String` | `''` | Error message from the surrounding form, shown in the field's alert. |

## Events

| Event | Payload | When |
|---|---|---|
| `update:modelValue` | `string` or `null` | A file was read (its `data:` URL), or Remove file was pressed (`null`). |

## What it checks, and what it leaves to the server

- **`accept`** narrows the picker, and the field checks the picked file against it again. A picker's filter is a suggestion the user can switch off.
- **`maxSize`** refuses a bigger file before reading it. It defaults to 1 MB, the same cap the widget forms use for a file carried inline. Raise it when the form expects scanned documents.

A refused file leaves the value as it was and says why in an alert. Both checks are for the person filling in the form. The server still decides what it accepts.

## An existing file

A value that is not a `data:` URL is a file the record already holds. The field shows it by its `title`, `filename`, `name` or the last part of its `path`, and emits nothing until the user replaces or removes it.

## Keyboard and screen readers

The native file input is hidden and never takes focus. The Choose file button opens it, so the control is reachable by keyboard. The label names a `role="group"` around the buttons, so a screen reader announces which file the button is for.

## Related

- [CnFormPage](./cn-form-page.md): the `type: "form"` page that renders it
- `readFileAsDataUrl` and `FALLBACK_MAX_BYTES` in [`src/utils/widgetUpload.js`](https://github.com/ConductionNL/nextcloud-vue/blob/main/src/utils/widgetUpload.js): the reader and the default cap it shares with the widget forms
