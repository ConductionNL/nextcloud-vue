## ADDED Requirements

### Requirement: A ring legend can carry each slice's value

A pie or donut `CnChartWidget` with `legendValues: true` SHALL write each legend entry as the slice's name followed by its value in the chart's value format. The name SHALL be written as text, never as markup. Without `legendValues` the legend SHALL stay as it was.

#### Scenario: Requests by category
- **GIVEN** a donut with labels "Afval" and "Parkeren", series 18 and 12, and `legendValues: true`
- **THEN** the legend SHALL read "Afval 18" and "Parkeren 12"

#### Scenario: A name with markup
- **GIVEN** a slice named "<b>Parkeren</b>"
- **THEN** the legend SHALL show the angle brackets as text

@e2e exclude An options mapping; the unit test reads the legend formatter of the mounted chart.
