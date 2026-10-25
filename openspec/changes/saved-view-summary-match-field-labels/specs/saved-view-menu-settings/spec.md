# saved-view-menu-settings Delta: saved-view-summary-match-field-labels

## ADDED Requirements

### Requirement: A filter on a record's identifier reads as the record's name

When a page's `filterLabels[key].reference` names `schema`, `matchField` and `labelField` (and optionally `register`, else the page's), a saved view's filter on `key` SHALL read as the `labelField` of the record whose `matchField` equals the value, under the entry's `label`. A value whose record is not found SHALL read as itself.

#### Scenario: Woo-verzoeken
- GIVEN the Cases page's filterLabels `caseTypeIdentifier: { label: "Case type", reference: { schema: "caseType", matchField: "identifier", labelField: "title" } }`
- AND a saved view filtering `caseTypeIdentifier: "woo-verzoek"`
- THEN its line reads "Zaaktype Woo-verzoek"
