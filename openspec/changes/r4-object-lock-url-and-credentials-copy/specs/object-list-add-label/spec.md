# object-list-add-label Delta: r4-object-lock-url-and-credentials-copy

## ADDED Requirements

### Requirement: The manifest Add label is translated by the app

`CnObjectListWidget` SHALL run `content.addLabel` through the host translate
function (`cnTranslate`, bound to the app id by CnAppRoot), as it does for
`content.emptyText` and `content.prompt`. Without a manifest label it SHALL
show the library's own "Add".

#### Scenario: A Dutch user on a pipelinq list

- **GIVEN** a manifest list with `addLabel: "Add lead"` and a Dutch catalogue entry "Lead toevoegen"
- **WHEN** a Dutch user sees the list
- **THEN** the button reads "Lead toevoegen"

#### Scenario: An app that already translated its label

- **GIVEN** an `addLabel` the app translated before handing it over
- **WHEN** the list renders
- **THEN** the label shows unchanged
