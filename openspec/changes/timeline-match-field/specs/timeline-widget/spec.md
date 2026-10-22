# timeline-widget Delta: timeline-match-field

## ADDED Requirements

### Requirement: Related rows can match a field of the current object

A `related` source with `matchField` SHALL read the rows whose `field` holds the current object's value at
`matchField`, not its id, SHALL read nothing while that value is empty, and SHALL read again when it changes. With
`summaryField` an event SHALL show that field of its row after its title.

#### Scenario: A pupil's notes on the learner profile

- **GIVEN** dossier notes that name the pupil by user id, and a timeline on the learner profile with `matchField: "ncUserId"`
- **WHEN** the profile page loads
- **THEN** the pupil's notes show on the timeline with their summaries
