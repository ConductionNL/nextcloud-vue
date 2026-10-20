# tabs-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stack-lone-card-fills-row](../../)

## ADDED Requirements

### Requirement: A laid-out card alone in its row fills it

In a gridded tab stack, a widget whose width comes from `layout` and that is alone in its row SHALL span the whole
row. Widgets sharing a row SHALL keep their `layout` widths; a `columns` share SHALL be left as it is.

#### Scenario: DqZaakLocatie

- **GIVEN** a case whose type hides the Priority card
- **THEN** the Locations card spans the whole Overview row

#### Scenario: DqZaak

- **GIVEN** a case that shows both Priority and Locations
- **THEN** they share the row at half width each
