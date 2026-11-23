# settings-form Delta: abstract-settings-form-file

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-settings-form-file](../../)

## Purpose

Let a settings form take a file reference from Nextcloud's file picker.

## ADDED Requirements

### Requirement: A file field takes a file from the Nextcloud picker

A `settings-form` field with `type: "file"` SHALL show the name of the stored file (or its `placeholder`) beside a
button that opens Nextcloud's file picker, filtered by `picker.mimeTypes` and started at `picker.startAt`, and SHALL
write the chosen file to the field through `picker.valueTemplate` (`{path}`, `{fileid}`, `{name}`; default `{path}`).
A closed picker SHALL change nothing.

#### Scenario: Logo kiezen uit media

- **GIVEN** a logo field limited to SVG and PNG
- **WHEN** the person chooses `/Media/nieuw.png`
- **THEN** the field shows "nieuw.png" and the form's next save sends the reference

### Requirement: A file field can be emptied

A file field with a value SHALL show a remove button; removing SHALL empty the value, and the form's save SHALL send
null for it.

#### Scenario: Logo verwijderen

- **WHEN** the person removes the logo and saves
- **THEN** the PATCH carries `logo: null`
