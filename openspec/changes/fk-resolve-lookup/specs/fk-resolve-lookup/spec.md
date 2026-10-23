# fk-resolve-lookup Delta: fk-resolve-lookup

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [fk-resolve-lookup](../../)

## Purpose

A reference cell can find its record by a property and build its label from the record.

## ADDED Requirements

### Requirement: A reference cell can look its record up by a property

An `fkResolve` cell with `matchField` SHALL find the first record of its register and schema whose `matchField`
equals the value, asking once per value for the page's life, and SHALL show nothing for that value until the lookup
answers. When `widgetProps.refField` names a row field holding a record id, the cell SHALL read that record first and
SHALL fall back to the `matchField` lookup when it does not resolve. A list of ids SHALL pair with a list of values by
position only when both lists are as long. The label SHALL be `labelTemplate` filled from the record when that is not
empty, else the value at `labelPath`, else `labelField`, `title` or `@self.name`. A value that resolves to no record
SHALL show as itself.

#### Scenario: A pupil by name

- **GIVEN** a column on `learnerId` with `matchField: "ncUserId"`, `refField: "learnerRef"` and
  `labelTemplate: "{givenName} {familyName}"`
- **THEN** a row with a `learnerRef` reads the profile by id and shows "Noor Bakker" without a lookup by user id
- **AND** a row without one finds the profile by `ncUserId` and shows nothing until it answers
