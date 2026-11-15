## ADDED Requirements

### Requirement: A page offers the actions OpenRegister lists for an object

A detail page with `actionsFrom: "openregister"` SHALL offer in its Actions menu every action OpenRegister lists for
the record on the header surface, in `actionsInclude` order when given. An action with input fields SHALL open a
dialog over its input schema before it runs; an action listed as not available SHALL be disabled with the server's
reason; a run SHALL post the inputs to the action's route, say when it continues in the background, and refresh the
page. A manifest `object-action` SHALL run the named action on the page's object.

#### Scenario: publishing a decision
- **GIVEN** a decision whose schema declares `publish` with a required `from` date
- **WHEN** the reader chooses Publish in the Actions menu
- **THEN** a dialog asks for the date, and confirming posts `{ inputs: { from } }` to `.../actions/publish`

### Requirement: A selection can run an action OpenRegister offers in bulk

An index page with `actionsFrom: "openregister"` SHALL add to its selection strip every action OpenRegister lists for
the schema whose `surfaces` include `bulk`, in `actionsInclude` order when given. Choosing one SHALL post the selected
ids and the inputs to the schema's action route in one request, say when it continues in the background, report a
refusal with the server's message, and read the list again.

#### Scenario: closing a selection
- **GIVEN** a schema whose `close` action lists the bulk surface
- **WHEN** the reader selects two rows and chooses Close
- **THEN** `{ ids, inputs }` is posted to `/api/object-actions/{register}/{schema}/close` once and the list reloads

### Requirement: A row can run an action OpenRegister declares

An index page row action with `type: "object-action"` and `action: "<key>"` SHALL run that action on the row it was
picked on, against the page's register and schema, and read the list again when it succeeds.

#### Scenario: closing one case from the list
- **GIVEN** a case list with a row action `{ type: "object-action", action: "close" }`
- **WHEN** the reader picks Close in a row's menu
- **THEN** the inputs are posted to `/api/objects/{register}/{schema}/{id}/actions/close` and the list reloads
