## ADDED Requirements

### Requirement: A search result names its reference and wraps

A search kind with `subtitleResolve` SHALL fill its subtitle template with the label of the referenced object, and `sourceConfig.titleWrap` SHALL wrap the Result column.

#### Scenario: A Woo case
- GIVEN subtitleTemplate "Case {identifier} · {caseTypeTitle}" and subtitleResolve on caseType
- THEN the line reads "Zaak 2026-0110 · Woo-verzoek"
