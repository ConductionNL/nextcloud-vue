# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-parent-crumb](../../)

## Purpose

A sub-record's page names the record it belongs to.

## ADDED Requirements

### Requirement: A sub-record trail can show its parent record

A crumb of CnDetailPage's `breadcrumb` MAY carry `parent`, the name of a `visibilityContext` entry, instead of `label`.
When the loaded record holds a reference in that entry's field, the crumb SHALL show the parent record's `labelField`
value, else its name or title, else the crumb's translated `label`, and SHALL link to `route` with the parent's id in the
`param` route parameter (default `id`), or to `href` with `{id}` replaced by the parent's id. When the record holds no
reference, the crumb SHALL be left out, and a trail with no crumb left before the record SHALL draw nothing.

#### Scenario: A sub-case

- **GIVEN** `visibilityContext: { parentRecord: { field: "parent", register: "app", schema: "case" } }` and
  `breadcrumb: [{ label: "Cases", route: "Cases" }, { parent: "parentRecord", labelField: "identifier", route: "CaseDetail" }]`
- **WHEN** a case whose `parent` is the case `Z-2026-001` opens
- **THEN** the trail reads "Cases / Z-2026-001 / <the case>", and the middle crumb links to `CaseDetail` with that case's id

#### Scenario: A case without a parent

- **GIVEN** the same page
- **WHEN** a case without `parent` opens
- **THEN** the trail reads "Cases / <the case>"
