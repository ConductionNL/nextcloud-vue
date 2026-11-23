# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-side-visible-when](../../)

## Purpose

A side column card shows only on the records it is for, as a grid widget does.

## ADDED Requirements

### Requirement: A side column widget shows only while its visibleWhen holds

CnDetailPage SHALL leave a side column entry (inline or a reference to `widgets`) out while its `visibleWhen` does not
hold for the record and the records `visibilityContext` names, evaluated exactly as for grid widgets, including endpoint
and source conditions. Edit mode SHALL show every entry. A side column with no visible entry SHALL not be drawn.

#### Scenario: A committee card on objections only

- **GIVEN** a side column entry with `visibleWhen: { field: "@context.caseType.category", op: "eq", value: "Bezwaar" }`
- **THEN** it shows on an objection case and not on a Woo request

#### Scenario: A local field condition

- **GIVEN** an inline side entry with `visibleWhen: { field: "status", op: "eq", value: "open" }`
- **THEN** it shows while the record is open
