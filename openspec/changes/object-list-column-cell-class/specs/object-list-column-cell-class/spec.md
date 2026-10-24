## ADDED Requirements

### Requirement: an object list column passes its cell class to the table

CnObjectListWidget MUST pass a manifest column's `cellClass` to CnDataTable, so `cn-cell--wrap` wraps that column's text.

#### Scenario: DqZaakContact summary
- GIVEN the contact moments' Samenvatting column with `cellClass: "cn-cell--wrap"`
- THEN a long summary wraps onto a second line instead of ending in an ellipsis
