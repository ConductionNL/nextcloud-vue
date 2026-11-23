## ADDED Requirements

### Requirement: A record list's footer can be a row with a lead and a prompt from the answer

With `footerAction.layout: "row"` the footer SHALL draw its note and its action in one row. With `footerAction.note` as
`{ path, lead }` the note SHALL start with the translated `lead` in bold and, while the list has no rows, continue with
the translated value at `path` of the list's own endpoint answer, read without a second request.

#### Scenario: a case without goals
- **GIVEN** the goals list answers `{ results: [], prompt: "no goals yet: what does the requester want to change?" }`
- **THEN** the footer row reads "**Doelen** nog geen doelen: wat wil de verzoeker dat er verandert?" with "Doel toevoegen" at its end

#### Scenario: a case with a goal
- **GIVEN** the list has one goal
- **THEN** the footer row reads "**Doelen**" and the action, without the prompt
