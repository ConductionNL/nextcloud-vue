## ADDED Requirements

### Requirement: The search term stands in the field and on the Active line

The search source SHALL take its term from the page's search field, and the term in the address SHALL be the field's first value. The Active line SHALL name the term as "Search term: {term}" with a remove button, and removing it SHALL clear the term.

#### Scenario: A search opened from the address
- **GIVEN** the search page opened on `?q=Lindelaan`
- **WHEN** it loads
- **THEN** the search field SHALL hold Lindelaan and the Active line SHALL read "Zoekterm: Lindelaan"
