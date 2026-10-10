# dutch-library-strings-and-files-crumb Delta

## Purpose

A Dutch reader meets the library's own words in Dutch, and the files browser
names what it shows.

## ADDED Requirements

### Requirement: A Dutch reader meets the library in Dutch

Every string `CnFilesBrowser`, `CnFilesTab`, `CnQuickFilterBar`, `CnFormField`
and `CnFormDialog` pass to `t('nextcloud-vue', …)` SHALL have a Dutch
translation in `l10n/nl.json`, in sentence case and without em-dashes.

#### Scenario: The chip, the optional mark and the files browser

- **GIVEN** a reader whose language is Dutch
- **WHEN** the quick filter chip counts 14 hidden filters, a form marks a field optional and the files browser draws its bar and header
- **THEN** they read "Nog 14 filters", "optioneel", "Nieuw", "Grootte" and "Gewijzigd"
- @e2e exclude translation lookup is covered by `tests/l10n/libraryStringsDutch.spec.js` with the real @nextcloud/l10n; the harness runs in English

### Requirement: The files browser names the object in its root crumb

`CnFilesTab` SHALL pass the files browser a root label: the host's
`browserRootLabel`, else the object's name (`@self.name`, else `title`, else
`name`, never a value equal to the object's uuid), else none, so the browser
shows the folder's own name. The name SHALL come from the object read that
resolves the folder, with no extra request. `resolveObjectFolder` SHALL keep
its signature and result.

#### Scenario: A case folder named after its uuid

- **GIVEN** a case whose folder on disk is its uuid and whose `@self.name` is "Verbouwing Herengracht 12"
- **WHEN** its Documents tab opens the files browser
- **THEN** the root crumb reads "Verbouwing Herengracht 12"
- @e2e exclude the object read and DAV search need a Nextcloud; covered by `tests/components/CnFilesTabRootCrumb.spec.js`

#### Scenario: The host names the root

- **GIVEN** a host that passes `browserRootLabel: "Zaakdossier"`
- **WHEN** the files browser renders
- **THEN** the root crumb reads "Zaakdossier"
- @e2e exclude covered by `tests/components/CnFilesTabRootCrumb.spec.js`

### Requirement: The files browser keeps its button labels whole

In the files browser bar the crumbs SHALL give way first: the New menu, the
columns chooser and the upload button SHALL keep their width, so their labels
are not cut while a crumb is long.

#### Scenario: A long crumb beside "Bestanden toevoegen"

- **GIVEN** a files browser of 520px whose root crumb is a uuid and whose upload button reads "Bestanden toevoegen"
- **WHEN** it renders
- **THEN** the button shows its whole label
- @e2e `e2e/files-browser-bar.e2e.js`
