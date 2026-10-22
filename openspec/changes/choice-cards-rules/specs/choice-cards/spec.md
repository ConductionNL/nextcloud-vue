# choice-cards Delta: choice-cards-rules

## ADDED Requirements

### Requirement: A multiple choice shows its rules live

CnChoiceCards with `rules` SHALL show, under the cards, one note per rule the selection breaks: fewer than `min`, more
than `max`, part of a `together` group without the rest, or more than one of an `exclusive` group, naming the options
by label. With `clashEndpoint` it SHALL read the endpoint for the picked values (`@selected`, comma-joined) whenever the
selection changes and show the notices it answers; with nothing picked it SHALL read nothing. With `rulesMetText` and
something picked, it SHALL say so when no rule is broken and no notice answered.

#### Scenario: Two electives that must go together

- **GIVEN** a rule that Biology and Chemistry go together
- **WHEN** a pupil picks Biology only
- **THEN** the note "Choose Biology and Chemistry together." shows under the cards
