## ADDED Requirements

### Requirement: A facts entry can show a user by name

`format: "user"` on a row or a line part SHALL show the display name of the
Nextcloud user whose id the value holds, looked up once per id through the
shared user name cache. While the name is not known the entry SHALL be empty
(and hidden under `hideEmpty`); a user that cannot be resolved SHALL read as
the id.

#### Scenario: the handler reads by name
- GIVEN a case whose `handler` is `pieter`, whose display name is Pieter Jansen
- WHEN the facts card shows `{ "path": "handler", "label": "Behandelaar", "format": "user" }`
- THEN the row reads "Pieter Jansen"
