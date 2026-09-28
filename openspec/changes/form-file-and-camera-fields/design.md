# Design: form-file-and-camera-fields

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `CnFileField` (`src/components/CnFileField/CnFileField.vue`) reads one
  file with `FileReader` into a `data:` URL, checks `accept` and
  `maxSize` (1 MB default, `:134`), and emits the URL. A value that is not
  a `data:` URL (a file the object already holds) is shown by its title
  and passed through.
- `cnFormFieldRenderer.js` maps `file` to `CnFileField`
  (`src/composables/cnFormFieldRenderer.js:124`, `:250-260`); `CnFormPage`
  renders through it.
- `CnFormDialog` has no file mapping. `fieldsFromSchema`
  (`src/utils/schema.js`) derives no widget for `type: "file"`.
- OpenRegister's `FilePropertyHandler` parses a data URI, base64, a URL
  or a file object for a `type: "file"` property (and an array of them),
  and checks `allowedTypes` and `maxSize` from the property's file
  configuration (`:1105-1122`).

## Decisions

### D1. The dialog gets the same file field

`fieldsFromSchema` maps `type: "file"` to widget `file` and an array
whose items are files to widget `file` with `multiple`. `accept` comes
from the property's `allowedTypes`, `maxSize` from its `maxSize`, so the
form refuses early what the server would refuse late. `CnFormDialog`
renders `CnFileField` for the widget, as `CnFormPage` does.

### D2. Several files, dropped or picked

With `multiple`, `CnFileField` keeps a list: each entry shows its name,
size and a remove button, and the value is an array. The field accepts a
drop on its area as well as the picker. Order is the order added.

### D3. Small files inline, large files uploaded after save

Under the inline cap (1 MB unless the field says otherwise) a file still
travels as a `data:` URL; that path works on create, when the object has
no id yet, and it is what OpenRegister already parses. Above the cap the
field holds the `File` and the form uploads it once the object exists:
after create, the form posts each held file to
`POST /api/objects/{register}/{schema}/{id}/filesMultipart` with
progress, then writes the returned file references onto the property. A
failed upload leaves the object saved, lists the file as not uploaded
with a Retry, and does not pretend success.

Rejected: raising the inline cap. A 20 MB base64 string inside a JSON
body is 27 MB the server has to hold in memory, and a timeout loses the
whole form.

### D4. Camera: the phone's own, or a webcam snapshot

`capture` on a field (`"environment"` or `"user"`) sets the input's
`capture` attribute and `accept="image/*"` unless the field narrows it,
so a phone opens its camera app and returns a photo or video into the
field. On a device where that attribute does nothing and
`navigator.mediaDevices.getUserMedia` is available, the field shows Take
photo, which opens `CnCameraCapture`: a live preview, Capture, Retake and
Use photo. The still is a JPEG `File` like any picked file. The camera is
never started until the user presses Take photo, and it is stopped when
the dialog closes.

Rejected: recording video from a webcam in the browser. A phone records
video through its own camera app via `capture`; a desktop user attaches
a recording like any file.

## Files

- `src/components/CnFileField/CnFileField.vue`: `multiple`, drop,
  `capture`, held files.
- `src/components/CnCameraCapture/`: new.
- `src/utils/schema.js`: the `file` widget from the schema.
- `src/components/CnFormDialog/CnFormDialog.vue`,
  `src/components/CnFormPage/CnFormPage.vue`: upload held files after
  save.
- `src/composables/cnFormFieldRenderer.js`: pass `multiple` and
  `capture`.

## Security and privacy

The camera needs the browser's permission, asked only on Take photo. The
stream is stopped on close, error and route change. Uploaded files go to
the object's own folder through OpenRegister, which checks types, size
and executable content again.

## Accessibility

The drop area is also a button that opens the picker. Take photo and the
capture dialog are keyboard operable; the preview has a text alternative
saying the camera is on.
