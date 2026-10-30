## ADDED Requirements

### Requirement: A page forwards its form-draft settings to the forms it opens

`CnIndexPage` and `CnDetailPage` SHALL take `draftAppId`, `allowDraft` and `draftField` and SHALL forward them to every `CnFormDialog` they open. `allowDraft` SHALL reach a create form as given, and an edit form only when the record's `draftField` is true.

#### Scenario: The edit form keeps its draft under the app's key

- **GIVEN** a detail page with `draftAppId: "dossiq"`
- **WHEN** the user opens the record's edit form
- **THEN** the form SHALL receive `draftAppId` "dossiq"

#### Scenario: Save draft is not offered on a record in use

- **GIVEN** a page with `allowDraft: true` and a record whose `isDraft` is false
- **WHEN** the user opens the record's edit form
- **THEN** the form SHALL NOT offer "Save draft"
- **AND** the create form of the same page SHALL offer it
