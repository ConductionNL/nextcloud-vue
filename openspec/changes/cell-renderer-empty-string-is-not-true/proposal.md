# cell-renderer-empty-string-is-not-true

## Why

On dossiq's Departments page (board dossiq/DqAfdelingen) every member without a role or e-mail showed a check mark in
"Rollen" and "E-mail", and "✓" in the "Vandaag" pill. The users source hands those cells an empty string, and
CnCellRenderer declared its `value` prop `[Boolean, String, ...]`: Vue casts an empty string to `true` when Boolean
comes before String in a prop's types, so the cell rendered as a boolean `true`. Every table with an empty text cell had
the same defect. CnSegmentedControl, CnChoiceCards and CnPropertyValueCell declared their value props the same way, so an
option or a form value of `''` arrived as `true`.

## What changes

- The value props of CnCellRenderer, CnSegmentedControl, CnChoiceCards and CnPropertyValueCell list String before
  Boolean, so an empty string stays an empty string. A real boolean is unchanged.
