## ADDED Requirements

### Requirement: A built-in party kind reads in the reader's language

The parties widget SHALL name OpenRegister's built-in party kinds in the reader's language, unless the record's own kinds source labels the kind.

#### Scenario: Dutch case parties
- GIVEN a Dutch user and a case with a colleague and an organisation as parties
- THEN their rows read "Collega" and "Organisatie", not "Colleague" and "Organisation"
