## ADDED Requirements

### Requirement: The files browser re-reads when the page says files changed

`CnFilesBrowser` SHALL re-read its open folder after a `cn:page:refresh`, `files:node:created`, `files:node:deleted`, `files:node:updated` or `files:node:moved` event, once per burst of events, and SHALL stop listening when it is unmounted.

#### Scenario: A file filed elsewhere on the page appears
- **GIVEN** a case's Files tab listing two files
- **WHEN** a dialog on the page files a third document and signals `cn:page:refresh`
- **THEN** the tab SHALL list three files without a reload

@e2e exclude Asserted in tests/components/CnFilesBrowserHearsThePage.spec.js over the DAV double; the event is the contract between the two surfaces.

### Requirement: A declared row action reads in the user's language

A row action, New-menu entry, bulk action or column label the host declares SHALL be read through the host's `cnTranslate`.

#### Scenario: A Dutch reader opens a file's menu
- **GIVEN** a manifest row action labelled "Document properties", on a Dutch instance
- **WHEN** the handler opens a file's menu
- **THEN** it SHALL read "Documenteigenschappen"

@e2e exclude Asserted in tests/components/CnFilesBrowserHearsThePage.spec.js with an injected translation.
