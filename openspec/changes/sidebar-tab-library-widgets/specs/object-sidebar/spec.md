# object-sidebar

## ADDED Requirements

### Requirement: A sidebar tab holds integrations and library widgets

A declared sidebar tab's widget `{ type: "integration", integrationId }` SHALL render the tab component of that registered integration with the object's id, register and schema, and SHALL render nothing when no integration has that id. A widget whose `type` is not a built-in, an app registry entry or a custom component, but is a library widget type, SHALL render that widget's renderer with its `content`, the object id and the object.

#### Scenario: The knowledge base in a client tab
- **GIVEN** a tab `{ "widgets": [{ "type": "integration", "integrationId": "xwiki" }] }` and the xwiki integration registered
- **THEN** the tab shows the xwiki integration's tab for the client

#### Scenario: A library search widget in a tab
- **GIVEN** a tab `{ "widgets": [{ "type": "kb-search", "content": { "space": "KCC" } }] }`
- **THEN** the tab shows kb-search with that content
