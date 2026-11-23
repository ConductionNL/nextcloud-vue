# facts-widget Delta: screens-facts-resolved-pill

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-facts-resolved-pill](../../)

## Purpose

A facts pill on a reference shows the referenced object's label and can be coloured by it.

## ADDED Requirements

### Requirement: A resolved value works as a pill

A facts entry with `as: "pill"` and `resolve` SHALL show the resolved label with `map` applied, and SHALL look its
tone up in `variantMap` or `colorMap` by the value of `resolve.toneField` on the referenced object when that is set,
then by the resolved label, then by the stored value. An entry without `resolve` SHALL look its tone up by the stored
value as before.

#### Scenario: A status coloured by its state

- **GIVEN** a task whose `status` is the id of a status object named "In review" with `state` "open"
- **AND** the entry is `{ as: "pill", path: "status", resolve: { register, schema, labelField: "name", toneField: "state" }, colorMap: { open: "warning" } }`
- **WHEN** the card renders
- **THEN** the pill reads "In review" in the warning tone and the id is not shown

#### Scenario: A tone by the resolved label

- **GIVEN** the entry has `resolve` without `toneField` and `variantMap: { "In review": "warning" }`
- **WHEN** the label resolves to "In review"
- **THEN** the pill takes the warning tone
