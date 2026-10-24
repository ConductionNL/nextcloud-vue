# detail-page Delta: detail-edit-form-subtitle

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-edit-form-subtitle](../../)

## Purpose

A detail page's edit form can say in one line what it covers.

## ADDED Requirements

### Requirement: A detail page's edit form can carry a subtitle

CnDetailPage SHALL hand its record edit form the configured `editSubtitle`, translated by the host, as the dialog's
subtitle, and SHALL hand it no subtitle when none is configured.

#### Scenario: DqZaakDialogen Zaak bewerken

- **WHEN** a page configures `editSubtitle` and the user opens Edit
- **THEN** the edit dialog shows that line, translated, under its title
