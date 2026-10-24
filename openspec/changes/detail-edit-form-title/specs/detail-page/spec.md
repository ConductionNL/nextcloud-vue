# detail-page Delta: detail-edit-form-title

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-edit-form-title](../../)

## Purpose

A detail page's edit form can be titled apart from the button that opens it.

## ADDED Requirements

### Requirement: A detail page's edit form can carry its own title

CnDetailPage SHALL title its record edit form with the configured `editTitle`, translated by the host, and SHALL fall
back to the Edit button's label when none is configured.

#### Scenario: DqZaakDialogen Zaak bewerken

- **WHEN** a page configures `editTitle` "Edit case" and the user presses Bewerken
- **THEN** the edit dialog is titled "Zaak bewerken"
