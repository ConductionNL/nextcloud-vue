# Proposal: condition-group-editor

## Why

The board PqSegmentBouwer draws a customer segment whose rules are grouped: "Plaats is gelijk aan Zuiddrecht", and one
of two Branche values, and "Laatste contact na" a date. Each group carries a "Hoe de voorwaarden samengaan" radio pair,
the inner group a written "Groep verwijderen". `CnConditionListEditor` holds all rows together and has no groups, so
pipelinq kept its own recursive editor. Saved views, report filters and flow conditions want the same editor.
The app side is pipelinq's change `segment-groups-its-rules` (ConductionNL/pipelinq#3013, task 1).

## What changes

- `CnConditionGroupEditor`: v-model on `{ type: 'AND' | 'OR', children }`, a child being a condition or a group;
  `fields`, `operators` in the host's own names (a map by field type or a function of the field), `maxDepth`
  (default 1), `errors` keyed by node path, `emptyText`.
  - Each group opens with the radio pair under "How the conditions combine"; rows read "Where", then "and" or "or";
    a row holding an inner group shows "all of these" or "one of these" with the group as an indented card.
  - Add group only on groups above `maxDepth`; an inner group has a written Remove group; a deeper tree still renders.
  - A NOT group is a locked row "These conditions are kept as written" that can only be removed.
  - A value that is not a group (a bare condition, a list, `children` without `type`) reads as one AND group.
- `CnConditionRow`: the field, operator and value row, extracted from `CnConditionListEditor`, which now draws its
  rows with it. The list editor's behaviour does not change.
