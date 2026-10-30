# week-strip-meta-through-relation Delta: week-strip-meta-through-relation

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [week-strip-meta-through-relation](../../)

## Purpose

A week strip item can say something about a related record, such as the case type's short name.

## ADDED Requirements

### Requirement: A week strip item can name a field of a related record

A `CnWeekStripWidget` source with `extend` SHALL ask OpenRegister to inline those relations (`_extend`), and a
meta field SHALL read a dotted path into the inlined record. A `metaFields` entry that is a list of fields SHALL
show the first field that holds a plain value, and nothing when none does. A source without `extend` SHALL send
no `_extend`.

#### Scenario: The case type's short name after the case number

- **GIVEN** a strip over cases with `extend: ["caseType"]` and `metaFields: ["identifier", ["caseType.shortName", "caseType.title"]]`, and case 2026-4837 of the type Woo-verzoek with short name "Woo"
- **WHEN** the strip renders
- **THEN** the item reads "2026-4837 · Woo"
- @e2e exclude the request shape and the meta text are covered by tests/components/CnWeekStripWidgetRelationMeta.spec.js; the live page is checked by the consuming app

#### Scenario: A case type without a short name

- **GIVEN** the same strip and case 2026-4836 of the type "Bezwaar" without a short name
- **WHEN** the strip renders
- **THEN** the item reads "2026-4836 · Bezwaar"
- @e2e exclude covered by tests/components/CnWeekStripWidgetRelationMeta.spec.js
