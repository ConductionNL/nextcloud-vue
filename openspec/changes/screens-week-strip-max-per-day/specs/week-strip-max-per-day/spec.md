# week-strip-max-per-day Delta: screens-week-strip-max-per-day

## ADDED Requirements

### Requirement: A day shows at most maxPerDay items

With `content.maxPerDay` set to a positive whole number, a day of `CnWeekStripWidget` SHALL show
its first `maxPerDay` items and a control that reads "+N more", N being the number of items left
out. With `content.moreRoute` the control SHALL be a link to that route. Without it the control
SHALL be a button that shows all items of that day and then reads "Show less", which restores the
cap. `content.moreLabel` SHALL replace the text, with `{count}` filled. A day with `maxPerDay`
items or fewer SHALL show no control, and a strip without `maxPerDay` SHALL render as before.

#### Scenario: A full day is capped

- **GIVEN** `maxPerDay: 3` and a day with eight deadlines
- **WHEN** the strip renders
- **THEN** that day shows three items and "+5 more", and the strip is no higher than a day of three items needs
- @e2e e2e/week-strip-max-per-day.e2e.js

#### Scenario: Opening a day in place

- **GIVEN** the same strip without `moreRoute`
- **WHEN** the user activates "+5 more"
- **THEN** the day shows all eight items and the control reads "Show less"
- @e2e e2e/week-strip-max-per-day.e2e.js
