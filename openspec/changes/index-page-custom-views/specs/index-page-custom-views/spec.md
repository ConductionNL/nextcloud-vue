## ADDED Requirements

### Requirement: A page can add its own view of the whole filtered list

CnIndexPage SHALL offer each entry of `customViews` (`{ id, label, icon?, component }`) as a
segment of the view switch after the built-in modes, open it with `?_view=<id>`, and draw it
with the named component, handing it the filtered rows the other views draw. An entry whose id
is a built-in mode or not a lower-camel id, or whose component does not resolve, MUST be left
out. A page without `customViews` MUST render exactly as before.

#### Scenario: The view draws the filtered rows

- **GIVEN** a page with `customViews: [{ id: 'diagram', label: 'Diagram', component: 'ConnectionsDiagram' }]` and the list filtered on type api
- **WHEN** the user picks the Diagram segment
- **THEN** ConnectionsDiagram renders with `rows` holding only the api rows
- **AND** a `rowClick` from it opens the row as a table row click does

#### Scenario: A view that cannot open is left out

- **GIVEN** an entry whose id is `table`, or whose component is not registered
- **WHEN** the page renders
- **THEN** the view switch offers no segment for it
