# files-browser Delta: files-drop-panel

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-drop-panel](../../)

## Purpose

Draw the files leaf's drop state as the board does.

## ADDED Requirements

### Requirement: The drop state fills the panel and says where the files go

With `dropOverlay` and `dropDetail`, CnFilesBrowser SHALL draw `dropDetail` under `dropLabel` in the drop state, both through the host translate, with `{count}` replaced by the number of files dragged; a line with `{count}` SHALL be left out when the browser does not say the count. The drop state SHALL then fill its panel (at least 320px high), and the live region SHALL say both lines. CnFilesTab SHALL forward `dropLabel` and `dropDetail`. Without `dropDetail` the drop state SHALL render as before.

#### Scenario: Three files onto a case

- **GIVEN** a case's files leaf with `dropLabel: "Laat los om toe te voegen"` and `dropDetail: "{count} bestanden komen bij zaak 2026-0082, als nog te beoordelen document."`
- **WHEN** the reader drags three files onto it
- **THEN** the overlay fills the panel and reads both lines with "3 bestanden"
