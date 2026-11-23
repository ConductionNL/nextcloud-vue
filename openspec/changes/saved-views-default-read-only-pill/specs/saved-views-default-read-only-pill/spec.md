# saved-views-default-read-only-pill Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-views-default-read-only-pill](../../)

## Purpose

The saved views panel shows that default views are read only the way the boards draw it.

## ADDED Requirements

### Requirement: The default views caption says read only as a pill

CnSavedViewsPanel SHALL draw a "Read only" pill with a lock icon after the Default views caption, and only there. The
line under that caption SHALL say where the views come from without repeating "Read only".

#### Scenario: DqFilterBeheren

- **GIVEN** the cases list's saved views panel with default views
- **THEN** "Standaardweergaven" carries the pill "Alleen lezen"
