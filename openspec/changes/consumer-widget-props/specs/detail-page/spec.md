# detail-page

## ADDED Requirements

### Requirement: An app widget takes its props from the manifest

A detail-page widget whose type is an app registry entry SHALL receive the props its `props` map names: literal values as written, and `@objectId`, `@object.<field>`, `@config.<key>` and `@content.<path>` tokens resolved against the page's record, the app config and the widget's own `content`. Only props the component declares SHALL be passed. A token that does not resolve SHALL be left out. A widget whose props ask for `@objectId` SHALL NOT mount while the page has no record id.

#### Scenario: Relationships on a client
- **GIVEN** a widget `{ "type": "ContactRelationshipsWidget", "props": { "entityId": "@objectId", "entityType": "client" } }`
- **WHEN** the client page shows client-1
- **THEN** the component receives `entityId: "client-1"` and `entityType: "client"`
