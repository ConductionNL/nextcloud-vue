# settings-fields-four-columns-and-note Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-fields-four-columns-and-note](../../)

## Purpose

A settings card lays out four fields in a row and names a setting kept elsewhere as text.

## ADDED Requirements

### Requirement: A settings section lays out four columns and draws a note

CnSettingsFieldsSection SHALL accept `columns: 4` and lay the fields out in four columns on a card at least 960px wide.
A field of `type: "note"` SHALL be drawn as its label and its `text`, without a control, and SHALL never be read,
marked dirty or saved.

#### Scenario: DqInstellingenAlgemeen

- **GIVEN** "Huisstijl" with `columns: 4` and "Teksten en toegang" with a CORS note
- **THEN** the four style fields stand in one row, and CORS reads as its label and "Ingesteld in de portaal-app (portaliq) en in Nextcloud, niet hier."
