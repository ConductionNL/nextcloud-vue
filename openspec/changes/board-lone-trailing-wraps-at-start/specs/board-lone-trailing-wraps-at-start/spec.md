# board-lone-trailing-wraps-at-start Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-lone-trailing-wraps-at-start](../../)

## Purpose

A record-list row whose only aside content is its trailing text draws it as the boards do.

## ADDED Requirements

### Requirement: A lone trailing line wraps under the text at its start

In the board look, a dashboard `CnRecordListWidget` row aside that holds only the trailing text SHALL not push itself to
the row's end and SHALL sit at the font's normal line height.

#### Scenario: DqDashboard "Vastgelopen zaken"

- **GIVEN** a 360px card with rows of a title, a case number and "12 dagen stil"
- **THEN** "12 dagen stil" wraps under the number at the row's start and the row is about 83px
