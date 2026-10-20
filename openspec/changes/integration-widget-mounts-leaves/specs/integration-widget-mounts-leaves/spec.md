# integration-widget-mounts-leaves Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [integration-widget-mounts-leaves](../../)

## ADDED Requirements

### Requirement: A single integration widget mounts a mount-mode leaf

CnIntegrationWidget with `only` SHALL mount a leaf with `renderMode: 'mount'` through CnLeafMountHost, with
the record context, `integrationContext` and `objectLabel`.

#### Scenario: dossiq

- **GIVEN** decidiq's approval chain registered as a mount-mode leaf
- **WHEN** a document dialog places `<CnIntegrationWidget only="decidiq-approval-chain">`
- **THEN** the leaf is mounted with the document's register, schema, id and title

### Requirement: An absent leaf says it is not available

An `integration` widget on a detail page whose leaf the registry does not hold SHALL show the integration empty state
naming the app, not nothing.

#### Scenario: dossiq

- **GIVEN** a case tab with `{ type: "integration", integrationId: "decidesk-decisions", appName: "Decidiq" }` and decidiq not loaded
- **THEN** the tab says "Decidiq not available"
