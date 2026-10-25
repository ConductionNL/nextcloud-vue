# board-settings-card-controls Delta: board-version-title-size

## ADDED Requirements

### Requirement: The version card title follows its board

In the board look the title of a settings card holding a compact version card SHALL be `--cn-board-version-title-size`, 17px when unset. CnAdminSettingsShell's `versionTitleSize` (px) SHALL set that variable on the shell.

#### Scenario: Dossiq
- GIVEN dossiq's General tab, which passes no size
- THEN "Versie-informatie" is 17px, as on DqInstellingenAlgemeen

#### Scenario: Pipelinq
- GIVEN pipelinq's admin page passing `versionTitleSize: 19`
- THEN its version card title is 19px, as on PqBeheer
