# board-index-sidebar-tabs Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-sidebar-tabs](../../)

## Purpose

The index side panel draws its header and tabs as the boards do.

## ADDED Requirements

### Requirement: The board index side panel draws the board's header and tab row

In the board look CnIndexSidebar SHALL title its panel 20px bold without the schema icon, and SHALL draw its tabs as
one row of 40px labels, 14px weight 600 in the soft ink, 4px apart on the strip's rule, the open tab in the deep
primary ink and underlined 2px in the primary colour. Outside the board look the panel SHALL keep NcAppSidebar's
chrome.

#### Scenario: DqFilterBeheren

- **GIVEN** the cases index page in the board look with its side panel open on "Weergaven"
- **THEN** "Alle zaken" is a 20px bold title with no icon before it
- **AND** "Zoeken", "Kolommen" and "Weergaven" sit in one row, 40px high, and only "Weergaven" is underlined
