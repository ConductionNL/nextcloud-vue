# user-settings-dialog-dq-board Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [user-settings-dialog-dq-board](../../)

## Purpose

The user settings dialog reads as Nextcloud's own settings dialog, as the dossiq board draws it.

## MODIFIED Requirements

### Requirement: The user settings dialog follows the Dq board

In the board look CnUserSettingsDialog SHALL be 900px wide and SHALL draw no dialog header and no footer. Its title
SHALL be an `h2` at the top of a navigation column on the light primary tint. The navigation SHALL list the Nextcloud
links (when given), the app's name and the app's sections by name without icons; the open section SHALL have a stronger
tint and a 3px bar. Every section SHALL stay visible, stacked on a white pane, and picking one in the navigation SHALL
scroll it into view, mark it current and focus its heading. A close icon in the corner SHALL close the dialog, and a
line under the sections SHALL say that changes are saved straight away. This replaces showing one section at a time.

#### Scenario: DqPersoonlijkeInstellingen

- **GIVEN** dossiq's personal settings in the board look with "Weergaven in mijn menu" and "Meldingen"
- **THEN** the dialog is 900px wide, "Persoonlijke instellingen" heads the tinted navigation, both sections show on
  the white pane, and there is no eyebrow, subtitle or footer

### Requirement: A board dialog can leave out its header

CnDialog SHALL take `headless`; in the board look it then SHALL NOT draw its header, and `name` SHALL stay the dialog's
accessible name.
