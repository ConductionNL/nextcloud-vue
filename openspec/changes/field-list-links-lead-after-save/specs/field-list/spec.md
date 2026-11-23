# field-list

## ADDED Requirements

### Requirement: A field list links its rows, leads with the object and calls after a save

A field list's `row.href` SHALL make the row title a link when the value at that path is an http(s) or root-relative link, opening an absolute link in a new tab with `noopener noreferrer`, and SHALL draw the title as text otherwise. `lead` SHALL draw a line above the rows, translated, with `{path}` placeholders filled from the object. `afterSave` SHALL be called after every save that went through, with `@objectId` and `@object.<field>` tokens resolved; when it fails, the save SHALL stand and `failureText` SHALL show.

#### Scenario: A dossier's documents link to their publication
- **GIVEN** a read-only list over `subjectReference.items` with `row.href: "url"`
- **THEN** each document with an http(s) url is a link that opens in a new tab
- **AND** a document with a `javascript:` url shows as text
