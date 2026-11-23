# nc-dashboard-due Delta: nc-dashboard-widgets

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [nc-dashboard-due](../../)

## Purpose

A Nextcloud Dashboard row says how its date stands.

## ADDED Requirements

### Requirement: A dashboard row says how its date stands

With `due: { field, ... }`, CnNcDashboardList SHALL draw each row's trailing line as the library's due text of that field: the days overdue, "Due today", the days left with `upcomingLabel` (else the date), or `emptyText` without a date, in place of `subtitle`.

#### Scenario: Deadline alerts

- **GIVEN** cases due three days ago, today and in two days, and one without a deadline
- **THEN** their lines read "3 days overdue", "Due today", "2 days remaining" and "No deadline"
