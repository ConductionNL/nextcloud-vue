## ADDED Requirements

### Requirement: A facts card can take its entries from the page context

A facts card's `fieldsFrom` SHALL name a list of entries on a page context record. When the list holds entries they SHALL be drawn instead of `fields`; otherwise `fields` SHALL be drawn. A template placeholder MAY name a format (`{path:format}`), and `year` SHALL format a date as its year.

#### Scenario: a Woo request
- **GIVEN** a case type whose `requestFields` lists the request's scope, a period pill and a kinds pill
- **THEN** the request card draws those, not the description

#### Scenario: a case type without request fields
- **THEN** the request card draws its own `fields`
