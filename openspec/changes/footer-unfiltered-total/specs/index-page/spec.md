## ADDED Requirements

### Requirement: A count value can ignore the user's filters and fill the footer note

A `countValues` entry with `unfiltered: true` MUST be read under the page's own `filter` only, without the active filters. The board footer note MUST fill `countValues` tokens (`{name}` or `{name|format}`) as the count line does; a value not read yet leaves its token empty.

#### Scenario: The footer names the whole list

@e2e exclude a token filled from a mocked aggregate; asserted by tests/components/CnIndexPageCountValues.spec.js.
- **WHEN** an event's registrations list filters on street Lindelaan, with `countValues: { allRegistrations: { metric: "count", unfiltered: true } }` and the footer note "{allRegistrations} registrations in total"
- **THEN** the count is read under the event filter alone and the footer reads "73 registrations in total" after "5 of 11"
