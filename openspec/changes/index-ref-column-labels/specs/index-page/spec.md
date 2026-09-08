# index-page Delta: index-ref-column-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-ref-column-labels](../../)

## Purpose

A `$ref` column shows the referenced object's label, not its id. Findings
A35 and A36 and defect triage #8 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: A reference column renders a label field

A column object over a `$ref` property SHALL accept `labelField` and `link`.
`CnIndexPage` SHALL resolve the referenced objects in one batch per schema per
page of rows and SHALL render `labelField`, else the referenced schema's title
field, else the id in mono. Rows SHALL render before labels arrive. With
`link: true` the label SHALL link to the referenced object's detail page when
the manifest declares one.

#### Scenario: Case title instead of uuid

- **GIVEN** a Tasks index with column `{ key: "case", labelField: "title" }` and ten tasks over three cases
- **WHEN** the page renders
- **THEN** one request fetches the three cases and each row shows its case title

#### Scenario: Deleted reference falls back

- **GIVEN** a task whose `case` points at a deleted object
- **WHEN** the page renders
- **THEN** that cell shows the id in mono and the other rows show titles

#### Scenario: Linked label

- **GIVEN** `{ key: "case", labelField: "title", link: true }` and a declared case detail page
- **WHEN** the page renders
- **THEN** the cell is a link to that case's detail route

@e2e include Render the Tasks index with a `labelField` column; assert the cell text is the case title and the link target; assert one batched request.

### Requirement: Filters on a reference column show labels

A filter facet or quick filter over a reference column SHALL list the
referenced objects by label and SHALL filter by id. A label column SHALL be
sortable only when the store can sort the extended field; otherwise its header
SHALL render unsortable.

#### Scenario: Requester facet

- **GIVEN** a Cases index with a reference column `requester` and a facet on it
- **WHEN** the facet opens
- **THEN** it lists requester names, and choosing one filters the list by that requester's id

#### Scenario: Unsortable when the store cannot

- **GIVEN** a store that cannot sort by an extended field
- **WHEN** the header renders
- **THEN** the label column header carries no sort control

@e2e include Open the requester facet on the Cases index; pick a name; assert the query carries the id and the rows match.
