# facts-days-since-phrase Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A facts part can say how many days ago and name an empty value

A facts line or lead part with `format: "days-since"` SHALL show the whole calendar days from its date until today, never below 0. A part with `phrase` SHALL write a count in words with `{n}` filled, using `phraseOne` for 1 and `phraseZero` for 0 when they are set. A part with `empty` SHALL show that text when its value is not there, and nothing else changes for a part with a value.

#### Scenario: PqContactmoment Over dit verzoek

- **GIVEN** a request that came in three days ago and has no handler
- **THEN** its subtitle reads "PQ-2026-0409 · verzoek · wacht 3 dagen · niet toegewezen"
