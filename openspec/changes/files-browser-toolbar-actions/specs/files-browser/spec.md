# files-browser Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-browser-toolbar-actions](../../)

## Purpose

The host decides which actions the files bar shows, and how.

## ADDED Requirements

### Requirement: The host chooses whether the bar has a New menu

With `newMenu: false` CnFilesBrowser SHALL draw no New menu and SHALL keep the host's `headerActions` buttons and, with
`uploadButton`, the upload button. Without the key it SHALL draw the New menu as before.

#### Scenario: DqZaakDocumenten

- **GIVEN** the case Files tab with `newMenu: false`, `uploadButton: true` and the request-file action in `headerActions`
- **THEN** the bar shows "Vraag een bestand aan een partij" and "Bestanden toevoegen", and no "Nieuw"
