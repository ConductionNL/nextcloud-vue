---
kind: code
---

# Proposal: nc-dashboard-due

## Summary

dossiq's deadline alerts and task reminders said "3 days overdue", "Due today" or "2 days remaining" per row. A single subtitle template cannot branch on a date, so the registrar's list fell back to the date. CnNcDashboardList now takes a `due` config and words the row's date with the library's due text, the same one record lists use.

## Scope

- `src/components/CnNcDashboardList/CnNcDashboardList.vue`, docs, spec.
- No schema change (the config lives in the app's entry script).
