# dialog-system Delta: form-file-and-camera-fields

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-file-and-camera-fields](../../)

## Purpose

Both forms take files: from the schema, several at a time, larger than
the inline cap, and straight from the camera. Rows `form-file-upload`
and `form-camera-capture` (buildiq matrix), with the humaniq and buildiq
halves.

## ADDED Requirements

### Requirement: The schema-driven dialog renders file properties

`fieldsFromSchema` SHALL map a property of `type: "file"` to a file
field, and an array whose items are files to a file field taking several
files. The field SHALL take its accepted types from the property's
`allowedTypes` and its size limit from `maxSize`. `CnFormDialog` SHALL
render it with `CnFileField`.

#### Scenario: A clerk attaches the signed decision

- GIVEN a Decision schema with a `signedCopy` property of `type: "file"` allowing `application/pdf`
- WHEN a clerk opens New decision
- THEN Signed copy is a file field that offers PDF files only

### Requirement: A file field takes several files and dropped files

A file field for an array SHALL keep a list of files, each shown with
its name, size and a remove button, and SHALL accept files dropped on its
area as well as picked.

#### Scenario: Three photos of the damage

- GIVEN a damage report form with a `photos` field for several files
- WHEN a resident drops three photos on the field
- THEN the field lists three photos
- AND removing one leaves two

### Requirement: Files over the inline cap are uploaded after save

A file under the field's inline cap SHALL be sent with the form as it is
today. A larger file SHALL be held and uploaded to the saved object's
files with progress once the object exists, and its reference written on
the property. A failed upload SHALL leave the object saved, SHALL name
the file as not uploaded and SHALL offer Retry.

#### Scenario: A 12 MB drawing

- GIVEN a permit form with a `drawing` file field and an inline cap of 1 MB
- WHEN an applicant attaches a 12 MB PDF and submits
- THEN the permit is saved, the drawing uploads with a progress bar, and the saved permit carries the drawing

#### Scenario: An upload that fails

- GIVEN the upload of the drawing fails
- WHEN the form finishes
- THEN it says the permit is saved and the drawing is not, with Retry

### Requirement: A field can take a photo from the camera

A file field with `capture` SHALL open the device camera on a phone
through the file input's `capture` attribute. Where that does not apply
and a camera is available, the field SHALL offer Take photo, which SHALL
start the camera only then, show a live preview with Capture, Retake and
Use photo, put the photo into the field as a file, and stop the camera
when closed.

#### Scenario: A parking receipt photographed on a phone

- GIVEN humaniq's expense form whose receipt field has `capture: "environment"`
- WHEN an employee taps the receipt field on her phone
- THEN the phone's camera opens and the photo lands in the field

#### Scenario: A webcam snapshot on a laptop

- GIVEN the same form on a laptop with a webcam
- WHEN the employee chooses Take photo, then Capture and Use photo
- THEN the receipt field holds the photo
- AND the camera light goes off
