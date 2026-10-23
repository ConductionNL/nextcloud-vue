# due-text Delta: due-text-today-near-done

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [due-text-today-near-done](../../)

## ADDED Requirements

### Requirement: A due date can read today as overdue, near days by name, and a finished deadline as done

With `todayTone: "danger"` a due date of today SHALL be drawn in the overdue tone. With `nearWithin: n` a due date
tomorrow SHALL read "Tomorrow" (or `tomorrowLabel`) and a date 2 to n days ahead SHALL read its weekday and date. With
`activeWhen` and `inactiveLabel`, a row where the condition does not hold SHALL read the label with `{date}` filled by
the short date, in the muted tone. Without these options the due text SHALL read as before.

#### Scenario: DqTaken deadlines

- **GIVEN** today is Wednesday 7 October and `{ todayTone: "danger", nearWithin: 6, soonWithin: 2, activeWhen: { field: "isTerminal", equals: false }, inactiveLabel: "Done on {date}" }`
- **THEN** a task due today reads "Vandaag" in red, one due on the 8th "Morgen" in orange, one due on the 9th
  "Vrijdag 9 okt" in orange, one due on the 14th "14 okt", and a finished task due on the 6th "Klaar op 6 okt" in grey
