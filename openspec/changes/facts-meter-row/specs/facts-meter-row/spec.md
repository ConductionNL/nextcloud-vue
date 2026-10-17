## ADDED Requirements

### Requirement: A facts entry can be a meter

A facts entry with `as: "meter"` SHALL show its label, the amount at `path`
and, when a positive numeric limit is read at `limitPath` or given as `limit`,
"{amount} of {limit}" with a bar whose width is the amount's share of the
limit, capped at 100%. Past the limit the bar SHALL be red and the text SHALL
say it is over the limit. Without a positive limit there SHALL be no bar. An
absent amount SHALL leave the meter out.

#### Scenario: Within the limit

- **GIVEN** `usage.users` 12 and `quota.users` 50
- **THEN** the meter reads "12 of 50" with a bar 24% wide

#### Scenario: Past the limit

- **GIVEN** an amount above the limit
- **THEN** the bar is full and red, and the text ends with "over the limit"

#### Scenario: No limit

- **GIVEN** a null limit
- **THEN** the meter shows the amount and no bar
- @e2e exclude covered by unit tests over the mounted widget
