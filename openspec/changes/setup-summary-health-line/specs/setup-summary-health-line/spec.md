## ADDED Requirements

### Requirement: The closing step says whether the installation checks passed
A `summary` step with `healthCheck: true` SHALL draw one line under the recap from the `health` block of the app's setup status. When every check passes, the line SHALL name all checks. Otherwise it SHALL name only the checks that failed. Without a `health` block, or without `healthCheck`, the step SHALL draw no line.

#### Scenario: Every check passes
- GIVEN a setup status whose `health` lists three checks that all pass
- WHEN the summary step with `healthCheck: true` opens
- THEN one line reads "Check passed:" followed by the three labels

#### Scenario: A check fails
- GIVEN a setup status whose `health` lists a check that fails
- WHEN the summary step opens
- THEN the line reads "Check found a problem:" followed by only the failing label

#### Scenario: No health reported
- GIVEN a setup status without a `health` block
- WHEN the summary step opens
- THEN no health line is drawn

### Requirement: The recap's Change button keeps its label
The Change button of a recap row SHALL NOT shrink below its label. A long value SHALL wrap instead.

#### Scenario: A long value
- GIVEN a recap row with a long value and `summaryEditable: true`
- WHEN the summary step opens
- THEN the row's Change button shows its whole label
