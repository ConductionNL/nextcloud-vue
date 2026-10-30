## ADDED Requirements

### Requirement: A data card reads yes/no as a word and shows a long text whole

CnObjectDataWidget SHALL show a boolean value as "Yes" or "No" in the user's language, and SHALL show a text value without cutting it short.

#### Scenario: a public sign-up flag
- GIVEN a mailing list whose public sign-up is on
- THEN its data card reads "Openbare aanmelding" "Ja" in the Dutch interface

#### Scenario: a false flag
- GIVEN a boolean field that is false
- THEN the card reads "Nee", not a dash

#### Scenario: a long description
- GIVEN a description of 136 characters
- THEN the card shows all of it, wrapped in its cell
