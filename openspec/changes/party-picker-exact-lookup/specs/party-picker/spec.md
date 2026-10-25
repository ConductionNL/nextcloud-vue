# party-picker Delta

## ADDED Requirements

### Requirement: A party source can look a term up exactly

A party picker source with `lookup: { url, when }` SHALL send a typed term that wholly matches `when` as a POST of
`{ term }` to `url`, and SHALL list the answer's `results`, instead of searching the term as free text. A term that
does not match SHALL be searched as before.

#### Scenario: A BSN in the new-case dialog

- **GIVEN** the Resident source with `lookup: { url: "/apps/dossiq/api/people/lookup", when: "^[0-9]{9}$" }`
- **WHEN** the handler types "999990627"
- **THEN** the picker POSTs `{ term: "999990627" }` to the lookup and lists Sanne de Vries
