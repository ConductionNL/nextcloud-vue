# board-bulk-band-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-bulk-band-leading](../../)

## Purpose

The bulk band reads as the index boards draw it.

## ADDED Requirements

### Requirement: The bulk band sets its lead as the boards do

In the board look the bulk band of an index page SHALL set its text at the font's normal line height. Its lead SHALL
keep 6px after it, before the first button. The Nextcloud look SHALL be unchanged.

#### Scenario: DqZaken with rows selected

- GIVEN the cases index in the board look with rows selected
- THEN "Met de geselecteerde zaken" is set at the normal line height
- AND the first button starts 14px after the lead (6px margin plus the 8px gap)
