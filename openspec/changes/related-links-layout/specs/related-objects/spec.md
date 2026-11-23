# related-objects Delta: related-links-layout

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [related-links-layout](../../)

## Purpose

Show a record's few related records as plain links, the way the boards draw a side card, without losing the rest.

## ADDED Requirements

### Requirement: Related records can be a plain list of links

A related widget with `layout: "links"` SHALL list the rows of the host's sections as plain links, one per line, the
label and the meta joined by a comma, and SHALL fall back to the related objects when the host declares no sections.
It SHALL offer "Show all" when the record has relations of its own, which opens the tabbed view. A reference section
with `labelTemplate` SHALL be named by that template filled from the referenced record, and `sectionOrder` (keys) SHALL
order the host's sections, the keys it leaves out after the named ones in their declared order.

#### Scenario: A receipt's related records

- **GIVEN** a transaction with a shift reference named "Shift {floatAt|date}, {drawer}" and a refund source
- **WHEN** the related widget has `layout: "links"`
- **THEN** it lists "Refund RF-2026-0058, pending" and "Shift 7 okt, Balie 2" as links, without tabs or a count
- **AND** "Show all" opens the tabbed view
