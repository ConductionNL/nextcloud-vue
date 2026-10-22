---
kind: code
---

# Proposal: workspace-filter-dependent-options

## Summary

learniq's timetable lookup switches between groups, teachers and rooms, then picks one of that kind. As two
workspace-filters the picker's options read `@workspace.kind`, but the filter only read its options again when its own
content changed, so the picker kept the first kind's options. A filter now reads its options again when another
workspace key its source reads changes, and drops a pick the new options no longer hold.

## Scope

CnWorkspaceFilterWidget, docs, jest spec.
