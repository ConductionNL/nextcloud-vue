# stat-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-caption-formats](../../)

## ADDED Requirements

### Requirement: A stat caption token can carry a format

A stat tile's caption token SHALL accept a template format (`{path|format}` or `{path|format:arg}`) and SHALL fill it from the endpoint payload as a template token is filled. A token without a format SHALL keep its current behaviour.

#### Scenario: PqContract recurring value

- **GIVEN** the payload `{ monthlyValue: 3500, annualValue: 42000 }` and the caption `per month, from {annualValue|currency} a year`
- **THEN** the caption reads "per maand, uit € 42.000,00 per jaar" in Dutch
