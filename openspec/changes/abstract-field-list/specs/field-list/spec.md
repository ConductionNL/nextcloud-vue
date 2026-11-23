# field-list Delta: abstract-field-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-field-list](../../)

## Purpose

Show and edit a list stored inside one field of the current object from configuration, instead of an app component per list.

## ADDED Requirements

### Requirement: A field list draws the entries of one object field

The `field-list` widget SHALL draw one row per entry of `objectData[content.field]`: a title (`row.title`, else
`row.titleFallback`), optional initials, a meta line, a pill, an aside text and a detail line (`{path}` template, shown
when `when` matches and every placeholder has a value), as configured. `rowSource` entries SHALL be merged over the
stored entries by `key` for display. An empty field SHALL show `emptyText`.

#### Scenario: A portal's domains

- **GIVEN** two domains, one not verified, and a detail template for unverified ones
- **WHEN** the widget renders
- **THEN** the unverified domain shows its TXT record line and the verified one does not

### Requirement: A field list saves one field with one PATCH

Every add and remove SHALL re-read the stored object and PATCH only `content.field`, with the change applied to the
stored list. A refused PATCH SHALL show the server's message and keep the list as stored.

#### Scenario: Adding an administrator

- **GIVEN** the stored list holds an entry added by someone else since the page loaded
- **WHEN** the user adds "lars"
- **THEN** the PATCH carries the stored entries plus "lars"

### Requirement: A field list adds and removes entries

The add form SHALL validate `required` and `pattern` before any request, SHALL refuse an entry whose `add.unique` key is
already stored, and SHALL write `add.defaults` with every new entry. With `remove`, each row SHALL have a remove
button named after the row. `readOnly` SHALL hide the form, the remove buttons and the row actions.

#### Scenario: A duplicate

- **WHEN** the user adds a user id that is already listed
- **THEN** nothing is written and the widget says it is already in the list

### Requirement: A field list row can run a configured request

A `rowActions` entry SHALL show on rows matching its `when` and SHALL send its request with `@objectId`,
`@object.<field>` and `@row.<field>` resolved, then read `rowSource` again; an answer's `message` SHALL show as an info
note and a failure as an error note.

#### Scenario: Check a domain again

- **WHEN** the user clicks "Check again" on an unverified domain
- **THEN** the widget POSTs `{ portal: <slug>, hostname: <host> }` to the configured url and re-reads the live state
