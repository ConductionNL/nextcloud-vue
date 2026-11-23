## ADDED Requirements

### Requirement: An install can go into a chosen target

A store page with `targets` SHALL show a picker of those targets, the first chosen by default, and SHALL send the chosen
target's id as `target` in the install request body. A store page without targets SHALL send the install request as
before, without a body.

#### Scenario: a skill bundle into one world
- **GIVEN** a store page with `targets` read from the `setting` schema and the world Aldoria picked
- **WHEN** the reader installs a skill bundle
- **THEN** the install request body is `{ "target": "<Aldoria's id>" }`
