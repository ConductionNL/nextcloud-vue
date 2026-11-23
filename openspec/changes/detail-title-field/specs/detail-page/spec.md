# detail-page Delta: detail-title-field

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-title-field](../../)

## Purpose

A detail page can name the record by one of its fields.

## ADDED Requirements

### Requirement: A detail page can name the record by a field

With `titleField` set (a dotted path), the detail page SHALL name the record by the record's value at that path: the
heading, and the breadcrumb's current crumb unless `breadcrumb.currentField` names another field. The type label SHALL
show as the eyebrow when it differs from that name. An empty, missing or object value SHALL fall back to the display
name. Without `titleField` the page SHALL render as before.

#### Scenario: An invoice named by its number

- **GIVEN** an invoice whose `@self.name` is "Debiteurenfactuur" and whose `number` is "F-2026-0001", on a page with `titleField: "number"`
- **WHEN** the page loads the invoice
- **THEN** the heading reads "F-2026-0001"

#### Scenario: An empty field

- **GIVEN** the same page and an invoice without a number
- **WHEN** the page loads it
- **THEN** the heading reads the display name, as without `titleField`
