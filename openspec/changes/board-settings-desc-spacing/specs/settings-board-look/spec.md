# settings-board-look Delta: board-settings-desc-spacing

## MODIFIED Requirements

### Requirement: A board admin settings card spaces its title and description as the board does

Under the board look the description of a CnAdminSettingsShell card SHALL start `descGap` px under the title (default 4px, as PtBeheerinstellingen draws it), and the card's content SHALL start 10px further under the description (14px by default).

#### Scenario: Configuratie
- GIVEN dossiq's System tab in the board look, its shell with `descGap: 6`
- THEN "In welk register Dossiq zaken bewaart …" starts 6px under "Configuratie" and the Register field 16px under it

#### Scenario: PtBeheerinstellingen
- GIVEN a shell without `descGap`
- THEN the description starts 4px under the title and the note card 14px under it
