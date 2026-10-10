# tab-counts Delta: screens-tab-counts-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-tab-counts-parity](../../)

## Purpose

A detail tab shows how many items its list holds, as the DqZaak, DqContact and
PtAccount boards draw it.

## ADDED Requirements

### Requirement: A tab can count its list

A `content.tabs[]` entry of a `tabs` widget SHALL accept `countFrom`. With
`"widget"` the widget SHALL count the list of the child widget the tab names,
from that widget's `content.register`, `content.schema` and `content.filter`,
with filter tokens resolved against the record. With an object
`{ register, schema, filter? }` it SHALL count that list. The count SHALL be
the list endpoint's `total`, read again when the record changes and on a page
or widget refresh. `count` and `countField` SHALL win over `countFrom`. A
failed count or a child without a register and schema SHALL show no number. A
tab without `countFrom` SHALL request nothing new.

#### Scenario: The contact's cases

- **GIVEN** a contact page whose Zaken tab names an object-list widget filtered on `requester: @objectId` with `countFrom: "widget"`, and two cases for this contact
- **WHEN** the page renders
- **THEN** the tab reads "Zaken 2"

@e2e include Read the tab strip on dossiq/DqContact and portaliq/PtAccount once the apps declare countFrom.

#### Scenario: A count that fails

- **GIVEN** the same tab and a list endpoint that answers 500
- **WHEN** the page renders
- **THEN** the tab reads "Zaken" without a number
