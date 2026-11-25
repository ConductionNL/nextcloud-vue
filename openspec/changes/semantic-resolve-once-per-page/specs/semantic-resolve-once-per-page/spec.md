## ADDED Requirements

### Requirement: A semantic type is resolved once per page

The library SHALL ask OpenRegister which schema implements a semantic-type URI at most once per page while the answer is kept, and every form naming that URI SHALL use the kept answer. A request that fails SHALL NOT be kept, so the next form asks again.

#### Scenario: A second form names the same URI
- **GIVEN** a form that resolved `https://schema.org/Organization`
- **WHEN** a second form naming the same URI opens on the same page
- **THEN** no new request SHALL be sent and the picker SHALL use the kept provider

#### Scenario: The first request failed
- **GIVEN** a form whose resolve request failed
- **WHEN** another form naming the same URI opens
- **THEN** it SHALL send the request again

@e2e exclude Asserted in tests/components/CnFormDialogSemanticReference.spec.js; the saved request is visible only in a network waterfall on a live instance.
