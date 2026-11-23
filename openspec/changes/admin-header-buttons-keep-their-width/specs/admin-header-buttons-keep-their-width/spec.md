# admin-header-buttons-keep-their-width Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The admin header buttons stay on one row

In the board look the button group of CnAdminSettingsShell's header SHALL keep its own width, so its buttons stay on
one row beside the title however long the path note under the title is.

#### Scenario: dossiq's advanced settings

- **GIVEN** Buildiq is enabled and an administrator opens dossiq's admin settings on the Geavanceerd tab
- **THEN** the buildiq square stands beside "Documentatie" and the tab strip sits where the other tabs have it
