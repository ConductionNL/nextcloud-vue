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
