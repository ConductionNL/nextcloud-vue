# index-page Delta: users-presence-message-tone

## ADDED Requirements

### Requirement: A member's status message reads as information

The users source SHALL tone a member's day line as success when present, warning when absent (with or without an end date) and information otherwise.

#### Scenario: Jamal is out in the field
- GIVEN his status message is "Buiten"
- THEN his Today pill is the information tone
