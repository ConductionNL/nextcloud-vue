---
kind: code
---

# Proposal: condition-tree-editor

## Summary

pipelinq decides a segment's members with a rule tree: AND/OR groups of conditions (field, operator, value) to any
depth, with an estimate of how many records match that updates as the rules are edited, and a validation error shown at
the condition it is about. It builds that in its own SegmentBuilder and SegmentRuleNode. OpenRegister saved views and
shillinq audiences need the same editor; CnFilterRowsEditor only does flat rows.

CnConditionTreeEditor is that editor, named by what it does. The fields, the operators and the endpoint that checks and
counts a tree are the app's configuration.

## Scope

- `src/components/CnConditionTreeEditor/` (new): the editor, its recursive node, the default operators per field type.
- `docs/components/cn-condition-tree-editor.md`.
- pipelinq's switch from SegmentBuilder follows once its open newsletters change (pipelinq #2555) has merged.
