## ADDED Requirements

### Requirement: A logs page draws the filter controls it declares

A logs page with `filterControls` SHALL draw a select, a reference picker or a date range per control, and SHALL send
the chosen values with the fetch: a select's option `filter` merged in, a reference as `<key>=<value>`, a range as
`<key>[gte]` and `<key>[lte]`. The page's own `filter` SHALL win a collision.

#### Scenario: server errors of one source
- **GIVEN** the source logs page with a Status select and a Source picker
- **WHEN** the reader picks Server error and the BRP source
- **THEN** the list asks for `statusCode[gte]=500` and `source=<BRP uuid>`, still scoped to outbound calls

### Requirement: A filtered log view is a link

Every control change SHALL be written to the address, and a page opened on an address SHALL show the controls set from
it. A date range with `range.defaultDays` SHALL preselect the last N days when the address holds no range.

#### Scenario: a row action into the logs
- **WHEN** a row action opens the logs page with `?source=<uuid>`
- **THEN** the Source picker shows that source and the list is filtered on it
