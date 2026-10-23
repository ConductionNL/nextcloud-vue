# dashboard-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-card-action-dialog](../../)

## ADDED Requirements

### Requirement: A dashboard card header action dispatches through the page

A dashboard card's header action SHALL run through the page's provided action dispatcher when there is one, so an
`open-modal` action opens the app's registry dialog, and SHALL dispatch with the page's router when there is none.

#### Scenario: DqCatalogus

- **GIVEN** the Store card with `headerActions: [{ label: "Import", action: { type: "open-modal", target: "CaseTypeImportDialog" } }]`
- **WHEN** the person clicks Importeren
- **THEN** the case type import dialog opens
