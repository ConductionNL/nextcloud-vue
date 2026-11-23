## ADDED Requirements

### Requirement: A checklist question reads as text, not as a form label

The checklist run SHALL draw a question's legend at 15px/600, its options at 15px regular weight, its help at 14px and its section heading at 14px/600, whatever weight a theme gives labels.

#### Scenario: a fire safety question
- **WHEN** the run shows "Zijn de vluchtwegen vrij?"
- **THEN** "Ja", "Nee" and "Niet van toepassing" SHALL read in regular weight
