# index-page Delta

## ADDED Requirements

### Requirement: Quick filter tabs can name a record matched on another field

With `quickFiltersFrom.register`, `schema` and `valueField`, CnIndexPage SHALL label each generated tab with the `labelField` (else title, else name) of the record whose `valueField` equals the tab's value, found in one list request. A value no record carries SHALL keep its raw text, and a failed request SHALL leave every tab with its raw text. The tab SHALL still filter the list on the raw value.

#### Scenario: Glossary terms per portal

- **GIVEN** 24 terms of portal `zuiddrecht` and 7 of `mijn-zuiddrecht`, and `quickFiltersFrom: { field: "portal", register: "portaliq", schema: "portal", valueField: "slug", labelField: "title", allLabel: "Alles" }`
- **THEN** the tabs read "Alles 31", "Gemeente Zuiddrecht 24", "Mijn Zuiddrecht 7"
- **AND** "Gemeente Zuiddrecht" filters the list on `portal: zuiddrecht`
