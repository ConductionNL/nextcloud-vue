# register-mapping Delta: stat-value-fits

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-value-fits](../../)

## Purpose

The register select is labelled once.

## ADDED Requirements

### Requirement: The register select has one label

The register select of a register mapping group SHALL carry one visible label, NcSelect's `inputLabel`, which names the combobox for assistive technology.

#### Scenario: One group

- **GIVEN** a register mapping with one group
- **THEN** "Register" shows once above the select and the combobox is named "Register"
