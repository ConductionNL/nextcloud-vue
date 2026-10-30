# register-group-row-size Delta: register-mapping

## ADDED Requirements

### Requirement: A closed group row is a 40px list row

In the board look a closed register group SHALL draw as a row at least 40px high with square corners and a rule under it.

#### Scenario: The admin page lists the point-of-sale group

- **GIVEN** the register mapping in the board look with Kassa closed
- **WHEN** the admin page renders
- **THEN** the Kassa row SHALL be 40px high with square corners
