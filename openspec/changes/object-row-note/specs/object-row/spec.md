# object-row Delta: object-row-note

## ADDED Requirements

### Requirement: A list row can draw a note

With `config.noteTemplate`, CnObjectRow SHALL draw a line under its subtitle, filled as `subtitleTemplate` is, wrapping
over as many lines as it needs. `config.noteToneField` SHALL name the dot path of the tone: `error` draws the line in the
error colour at weight 600, anything else in the primary ink. An empty note SHALL draw nothing.

#### Scenario: Board DqTeamwachtrij

- **GIVEN** a row with a refused handover, tone `error`
- **THEN** the refusal reads under the meta line in the error colour
