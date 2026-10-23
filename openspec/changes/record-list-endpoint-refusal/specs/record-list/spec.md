## ADDED Requirements

### Requirement: A refused endpoint read says why

A record list reading an `endpointSource` SHALL show a 401 or 403 answer as the
server's `message`, translated through the app's catalogue, in place of the
error line. Any other failure SHALL show `errorText`, else the default error
line.

#### Scenario: the household card for a reader outside the sensitive group
- GIVEN a record list over `/apps/dossiq/api/cases/c1/household-cases`
- WHEN the endpoint answers 403 with message "Only someone who works with the social domain's sensitive data on this case can see its household."
- THEN the card shows that sentence (in the reader's language) and not "This list could not be loaded."

#### Scenario: a server error
- GIVEN the same list
- WHEN the endpoint answers 500
- THEN the card shows `errorText`, else "This list could not be loaded."
