# Design: abstract-settings-form-file

- Display: the last path segment of the stored value, else `placeholder`, in a framed box that is not an input; the
  choose button is named by `chooseLabel`, the remove button (only with a value) by `clearLabel`.
- Picker: `getFilePickerBuilder(title).setMultiSelect(false).allowDirectories(false).startAt(startAt || '/')`, a
  `setMimeTypeFilter` when `mimeTypes` is set, a primary "Choose" button; `@nextcloud/dialogs` styles are imported like
  `CnFilesWidgetForm` does. A closed picker (`FilePickerClosed`) changes nothing; any other failure shows "The file
  picker could not be opened." in the form's note.
- Value: `valueTemplate` filled from the node (`{path}`, `{fileid}`, `{name}`); default `{path}`. An emptied value is
  sent as null like every other emptied field.
- Saving, baseline and refusal handling are the settings-form's own.
