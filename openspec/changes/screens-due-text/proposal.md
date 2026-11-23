---
kind: code
---

# Proposal: screens-due-text

## Summary

The Mijn werk page drew a due date as "Deadline {date}". The old page read "3 dagen te laat" in
red, "Vandaag", a date, and "Geen deadline". One due-text formatter, built on the relative date
(`formatRelativeDate`), serves record-list rows and table cells.

## What changes

1. `content.due` on the record list: `{ field, todayLabel?, overdueLabel?: { one, other }, emptyText? }`.
2. `widgetProps.due` on a `date` column, same keys.
3. Overdue reads "{count} days overdue" in the danger colour, today reads "Due today" (or `todayLabel`),
   a day to come reads "tomorrow" or the short date, an empty field reads `emptyText` (muted) or nothing.
4. The catalogue gains the plural `{count} day overdue` (nl "1 dag te laat").

No schema change. Without the keys nothing changes.
