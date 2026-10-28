# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-row-refs](../../)

## ADDED Requirements

### Requirement: Object rows can read the records they name

A record list over `objectRows` with `refs` SHALL read, for each ref, the record every row names in `field` from `register`/`schema`, each distinct record once and fifty at most, and SHALL put it on the row as `as`. A record that cannot be read SHALL leave the row as it was.

#### Scenario: PqContract lines

- **GIVEN** a contract whose `lineItems` name products by `productRef`, and `refs: [{ field: "productRef", register: "pipelinq", schema: "product", as: "product" }]`
- **THEN** a column `{product.name}` reads "Veldonderhoud, per veld" and each product is read once
