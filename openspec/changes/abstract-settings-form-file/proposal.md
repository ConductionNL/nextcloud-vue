---
kind: code
---

# Proposal: abstract-settings-form-file

## Summary

PtPortalInstellingen draws the portal logo as a small box with the file name ("logo-zuiddrecht.svg") and a button
"Logo kiezen uit media". portaliq's `PortalDetailsForm` has a free-text `logo` field for the same thing. This change
adds a `file` field type to the `settings-form` widget (#1515): a file name beside a "choose" button that opens
Nextcloud's file picker, and a remove button.

What the library and Nextcloud already offer was checked first: `CnFileField` is a file UPLOAD control (it reads the
file into a value) and `CnFilesWidgetForm` / `CnRelatedFiles` already open Nextcloud's `getFilePickerBuilder`. The new
field type uses the same picker (restricted by `picker.mimeTypes`, started at `picker.startAt`) and stores a
reference, not the file contents.

## Scope

`type: "file"` on a settings-form field, with `picker: { title?, mimeTypes?, startAt?, valueTemplate? }`,
`chooseLabel`, `clearLabel`, `placeholder`. The chosen node is written to the field through `valueTemplate` with
`{path}`, `{fileid}` and `{name}` (default `{path}`); the form's usual one PATCH saves it, remove sends null. Docs, unit
tests, harness e2e (the picker itself needs a Nextcloud server; the e2e covers the field, the remove and the PATCH).
No schema change. Stacked on field-list table variant and the widgets before it.

## Open point

Which reference portaliq stores for a logo from Media (a Nextcloud path, a file id, or the id of an OpenRegister media
object) is not in the board or in `portalDetails.js` (a free-text string). `valueTemplate` covers path and file id; a
media OBJECT picker would be a different source (an object picker), not built here.
