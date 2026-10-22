# A select in a board settings card has its label above the control

## Why

In a board settings card a text field's label is raised above the control,
and the field makes room for it. NcSelect's search is an NcInputField as well,
so both rules also caught a select's inner field. The select's own margin
rules win over the field's, though. The label therefore rose 24px over a select
that kept only 6px of margin, and landed on whatever stood above it: the
Register and Kadaster selects on DqInstellingen and DqDashboard. R22-DASH traced
this.

## What changes

- The text-field rules leave a select's inner field alone (`:not(.v-select *)`).
- The select itself makes the 26px of room, and its label is raised above the
  control with the same type as a text field's.
- Checked on :8080 by injecting the rules: the "Thema" label sits between the
  field above and its select, with no overlap.
