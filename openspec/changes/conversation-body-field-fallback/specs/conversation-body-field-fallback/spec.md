## ADDED Requirements

### Requirement: A message's text can fall back across fields

When `bodyField` is a list, the conversation SHALL show the first listed field that holds text.

#### Scenario: an e-mail with its full text and a call with a summary only
- GIVEN `bodyField: ["message", "summary"]`
- THEN the e-mail shows its message and the call its summary
