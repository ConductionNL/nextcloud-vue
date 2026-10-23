# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-checklist](../../)

## ADDED Requirements

### Requirement: A record list can draw its rows as a checklist

With `presentation: "checklist"` CnRecordListWidget SHALL draw its rows in `columns`, a row for which `done` holds marked
done and announced as done, any other row marked and announced as not done yet, and with `progress: true` a bar of the done
share above them.

#### Scenario: DqTenant Inrichten

- **GIVEN** the onboarding steps with `done: { field: "status", op: "eq", value: "completed" }` and `progress: true`
- **AND** five of seven steps completed
- **THEN** five steps are ticked, two are open, the bar stands at 71% and the header reads "5 van 7 stappen klaar"
