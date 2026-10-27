# admin-buildiq-square Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The admin header shows the buildiq square

In the board look CnAdminSettingsShell SHALL draw the buildiq square beside Documentation whenever Buildiq is
available to the user; without a manifest editor on the page the square SHALL link to the app with `cn_edit=1`.

#### Scenario: pipelinq's admin settings

- **GIVEN** Buildiq is enabled and an administrator opens pipelinq's admin settings
- **THEN** the orange square stands after "Documentatie" and leads to pipelinq in edit mode

### Requirement: The app opens in edit mode from the admin square

CnAppRoot SHALL enter manifest edit mode once when the URL carries `cn_edit=1` and Buildiq is available, and SHALL
remove the parameter so a reload does not enter it again.

#### Scenario: following the square

- **GIVEN** `/apps/pipelinq/?cn_edit=1` with Buildiq enabled
- **THEN** the app opens in edit mode and the address reads `/apps/pipelinq/`
