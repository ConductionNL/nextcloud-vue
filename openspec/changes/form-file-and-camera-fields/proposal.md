---
kind: code
depends_on: []
---

# Proposal: form-file-and-camera-fields

## Why

Forms collect attachments: a receipt, a photo of the damage, a signed
PDF. The library's form page has a file field, `CnFileField`, which reads
one file of at most 1 MB into a `data:` URL and sends it with the form.
OpenRegister then stores it in the object's folder. That covers a small
scan. It does not cover several files, a phone video, or a 12 MB
drawing, and on a phone it does not open the camera.

The schema-driven dialog, `CnFormDialog`, has no file field at all: a
schema property of `type: "file"` does not render as an upload anywhere
in it.

## Rows

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| buildiq | `form-file-upload` | Let people upload files in a form. | partial | built |
| buildiq | `form-camera-capture` | Capture photos or video with the device camera straight into a form. | no | none |

`form-file-upload` built evidence: "Renderer supports it: nextcloud-vue
v2.55.1 cnFormFieldRenderer.js:127,250-260 type 'file' renders
CnFileField, value is the picked file as a data: URL". Note: "When used,
the file travels inline as a data: URL inside the submitted JSON rather
than as a Nextcloud file." Read for this change: OpenRegister does store
it as a Nextcloud file on save (`FilePropertyHandler` parses data URIs);
the real limits are one file, the 1 MB cap, and no file field in
`CnFormDialog`. That is the missing half. Buildiq's own half is offering
the `file` type in its field builder.

`form-camera-capture` built evidence: "grep -iE
'getUserMedia|camera|capture' over src/ and nextcloud-vue v2.55.1
CnFormPage: no camera capture". Origin: competitor-derived,
https://github.com/appsmithorg/appsmith/blob/v2.4.2/app/client/src/widgets/index.ts#L309

## Competitor evidence, quoted from the buildiq matrix

`form-file-upload`, four competitors rated yes:

- NocoBase: "attachment fields render an upload control in any form
  block", https://github.com/nocobase/nocobase (v2.2.18)
- Budibase: "attachmentfield, :5653 attachmentsinglefield and :6003
  s3upload; all in the Form category", https://github.com/Budibase/budibase (v3.46.0)
- Appsmith: "FILE_PICKER_WIDGET_V2 ... JSON form offers a file field
  too", https://github.com/appsmithorg/appsmith (v2.4.2)
- Mendix: "input widgets include File Manager",
  https://docs.mendix.com/refguide/common-widget-properties/

`form-camera-capture`, three competitors rated yes:

- Appsmith: "CAMERA_WIDGET registered ... captured image or video binds
  into queries", https://github.com/appsmithorg/appsmith (v2.4.2)
- Mendix: "Take picture and Take picture (advanced) nanoflow actions that
  open the camera and store the picture",
  https://docs.mendix.com/appstore/modules/native-mobile-resources/
- Microsoft Power Apps: "the Camera control captures pictures with the
  device camera once the user authorises it",
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-camera

## Sibling halves this change also covers

- humaniq `self-service-mobile` (REQ-MOB-003): the expense receipt field
  "gains `accept: image/*` and `capture: environment`, passed through to
  the library's file input". Humaniq passes the hint; the library honours
  it.
- buildiq `data-field-types-and-choice-lists`: "A file field depends on
  nextcloud-vue's form file upload (matrix row `form-file-upload`, owner
  nextcloud-vue)."

## What changes

- `CnFormDialog` renders a schema property of `type: "file"`, or an array
  of files, as a file field, with the property's allowed types and size.
- `CnFileField` takes several files when the field is an array, accepts
  drag and drop, and shows each file with its size and a remove button.
- Files over the inline cap are uploaded to the object's files after the
  object is saved, with progress, instead of being refused.
- A field with `capture` opens the camera on a phone, and offers Take
  photo on a device with a webcam, putting the picture in the same field.

## Affected projects

- `nextcloud-vue`: `CnFileField`, `CnFormDialog`, `CnFormPage`,
  `cnFormFieldRenderer.js`, `src/utils/schema.js`, a new
  `CnCameraCapture`.
- Consumers: buildiq forms, humaniq expenses, dossiq intake, pipelinq
  requests.

## Backward compatibility

A single file under the cap still travels inline as today. A `type:
"file"` property in `CnFormDialog` used to render as a text input; it now
renders as a file field. No prop is removed; `multiple` and `capture`
default off.

## Cross-project dependencies

- OpenRegister accepts a file property as a data URI, base64, a URL or a
  file object (`lib/Service/Object/SaveObject/FilePropertyHandler.php`),
  and uploads through `POST .../{id}/filesMultipart`
  (`appinfo/routes.php:1461` at `555af72`). Whether a file object naming
  an already attached file keeps that file on the property is to be
  confirmed against OpenRegister before task 3; if not, that is an
  OpenRegister item.
