# duplicate-warning Delta: duplicate-warning

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [duplicate-warning](../../)

## Purpose

One "this may already exist" warning, in every app that files records.

## ADDED Requirements

### Requirement: A generic duplicate warning

CnDuplicateWarning SHALL render the scored matches it is given and SHALL NOT score anything itself. Each row SHALL show the readable record's `rowTitle`, `rowMeta` and a link from `recordUrl`, or "A record you may not open" without a link, then the matched fields through `fieldLabels` and the score as a percentage. Under `warn` it SHALL offer "File it anyway". Under `block` it SHALL offer it only when `mayOverride`, with a required reason, and otherwise say the record cannot be filed twice. Filing SHALL emit `{ reason, over }` with the matched uuids. `openDuplicateWarning` SHALL resolve with that decision, or null on cancel.

#### Scenario: A coordinator files over a block

- **GIVEN** two matches under a `block` policy for a coordinator who may override
- **WHEN** they write why and press File it anyway
- **THEN** the warning emits the reason and both matched uuids

#### Scenario: A handler under a block

- **GIVEN** the same matches for a handler who may not override
- **THEN** no way through is offered and the warning says to open the record it matches
