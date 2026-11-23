## ADDED Requirements

### Requirement: A search kind can word the line under a result

A search source kind SHALL fill the line under a result from `subtitleTemplate`, translated and filled from the found
object, when it declares one, and from `subtitleField` otherwise.

#### Scenario: A case
- GIVEN the kind cases with `subtitleTemplate` "Case {identifier}" and a Dutch translate
- WHEN the search finds case 2026-0082
- THEN its line reads "Zaak 2026-0082"
