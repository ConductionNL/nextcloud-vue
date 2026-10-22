## ADDED Requirements

### Requirement: a header filter can work on a nested field or on the field a column names

A column whose key is a dotted path through object properties MUST filter that nested field under its dotted name, with the kind taken from the nested property. A column with `filterField` MUST filter that stored field instead of its key. This MUST also apply to a computed column, which otherwise has no filter.

#### Scenario: Plaats on the organisations list
- GIVEN a column `address.place` and a schema whose `address` object has a string `place`
- WHEN the user filters it on "zuid"
- THEN the request carries `address.place[like]=zuid`

#### Scenario: a computed count that names its stored field
- GIVEN an `aggregate` column with `filterField: "openCaseCount"`, an integer property
- THEN its header offers a from-to number filter on `openCaseCount[gte]` / `openCaseCount[lte]`

#### Scenario: a computed column that names no field
- GIVEN an `aggregate` column without `filterField`
- THEN its header has no filter
