# board-bulk-band-no-hint Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-bulk-band-no-hint](../../)

## Purpose

The bulk band is the lead and the buttons, as the index boards draw it.

## ADDED Requirements

### Requirement: The board bulk band draws no hint line

In the board look the bulk band SHALL NOT draw its hint line. The Nextcloud look SHALL keep it.

#### Scenario: DqZaken with rows selected

- GIVEN the cases index in the board look with rows selected
- THEN the bulk band shows "Met de geselecteerde zaken" and its buttons, and no hint line under them
