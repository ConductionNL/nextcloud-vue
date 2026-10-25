## ADDED Requirements

### Requirement: Every plural is registered

A catalog SHALL keep each plural under `plurals`, never as an array under `translations`, so the library registers it.

#### Scenario: A range from today for a Dutch reader
- GIVEN a deadline filter from today to today + 7 days
- WHEN a Dutch reader sees the Active line
- THEN it reads "binnen 7 dagen"
