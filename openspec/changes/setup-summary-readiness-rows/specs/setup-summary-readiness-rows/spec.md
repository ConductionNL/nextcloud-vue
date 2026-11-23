## ADDED Requirements

### Requirement: The closing step lists what is ready and where to change it
Under the board look a `summary` step with `rows` SHALL draw one row per entry, in the declared order, with a done mark, a detail line and the link to the screen where it changes. A row naming a `step` SHALL take that step's recap. Any other row SHALL be done only when its `doneWhen` holds in the setup status.

#### Scenario: A step row
- GIVEN a summary step with a row naming a completed step
- WHEN the step opens
- THEN the row shows that step's title and its value, marked done

#### Scenario: An open row
- GIVEN a row whose `doneWhen` does not hold
- WHEN the step opens
- THEN the row is open and shows `detailWhenOpen`

#### Scenario: Without the board look
- GIVEN the same step without the board look
- WHEN the step opens
- THEN the summary recap renders as before
