## ADDED Requirements

### Requirement: The host may name a leaf in its own words

A `linked` card leaf written as `{ id, noun }`, with no register or schema, SHALL be the registered integration leaf of that id. The card SHALL use the host's `noun`, through the host translate, wherever it names that leaf (the "...: nothing linked" line and the count row), instead of the noun the leaf reports. A leaf written as a bare id SHALL keep the noun it reports.

#### Scenario: DqZaak "Gekoppeld"
- GIVEN dossiq lists `{ "id": "shillinq-financial-documents-panel", "noun": "fees and payments" }`, the contracts leaf and the projects leaf, and none has anything linked
- WHEN the finance leaf reports the noun "financiële documenten"
- THEN the card reads "Leges en betalingen, contract en projecten: niets gekoppeld"

#### Scenario: A leaf without a host noun
- GIVEN a leaf listed by its bare id reports "financiële documenten" with nothing linked
- THEN the card reads "Financiële documenten: niets gekoppeld"
