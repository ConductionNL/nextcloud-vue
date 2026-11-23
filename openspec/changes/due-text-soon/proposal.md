# due-text-soon

## Why

Board DqTeamwachtrij draws a deadline within a week in orange and an overdue one in red. The due text knew only the
red: a deadline in three days read in the plain text colour.

## What changes

- `due.soonWithin` (days): today and a date at most that many days ahead carry `soon: true` and draw in the warning
  colour, in a table cell and in a record list row. Without it nothing changes.
