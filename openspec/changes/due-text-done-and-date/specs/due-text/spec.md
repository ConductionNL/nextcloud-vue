# due-text-done-and-date Delta: due-text-done-and-date

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [due-text-done-and-date](../../)

## ADDED Requirements

### Requirement: A due text names the date and a done row

`{date}` in `overdueLabel`, `todayLabel` and `upcomingLabel` SHALL be the short due date. With `doneField`, a row whose done date is set SHALL read `doneLabel` (default "{date}") in the `muted` tone instead of the term, `{date}` the done date and `{value}` the row's `doneValueField` through `doneValueLabels`; an empty value SHALL drop a trailing separator. CnRecordListWidget SHALL pass the row.
