## ADDED Requirements

### Requirement: a bar list can be drawn wide

A `bar-list` chart with `barListWide: true` MUST draw a 220px label column, a 90px value column and 12px bars 12px apart, and in the board look on a bordered dashboard card MUST start directly under the card header. Without it the bar list MUST keep its compact look.

#### Scenario: DqTermijnen Op tijd beslist per zaaktype
- GIVEN five case types with their share decided on time
- THEN the first row starts 73px under the card top, the rows stand 29px apart, the bars run from 232px to 972px into the card, and the card is 227px tall

#### Scenario: DqDashboard Zaken per status
- GIVEN the bar list without `barListWide`
- THEN it keeps 170px labels, 14px bars and 10px between rows
