# app-nav Delta: my-views-caption-pencil

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [my-views-caption-pencil](../../)

## Purpose

The My views heading leads to where its entries are changed.

## ADDED Requirements

### Requirement: The My views heading opens the views settings

The My views menu caption SHALL carry a pencil that opens the user settings dialog. A caption with
`action: "user-settings"` SHALL draw that pencil as a button calling cnOpenUserSettings.

#### Scenario: DqZijbalk

- **WHEN** a user presses the pencil beside "Mijn weergaven"
- **THEN** the user settings dialog opens, with its "Views in my menu" section
