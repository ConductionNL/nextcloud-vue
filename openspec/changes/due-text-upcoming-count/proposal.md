# Proposal: due-text-upcoming-count

## Why

Board DqTeamwachtrij reads a deadline still to come as the time left: "nog 4 dagen", "nog 28 dagen", "nog 8 weken".
The due text (`utils/dueText`) reads such a date as the short date ("21 okt"), and only the overdue text could be
configured.

## What changes

- The `due` config takes `upcomingLabel` `{ one, other }` with `{count}`: a day to come reads the days left.
- `upcomingWeeksLabel` `{ one, other }` reads the weeks left, rounded, from `upcomingWeeksFrom` days left (default 35).
- Without these keys a day to come reads as before. Record-list rows (`due`) and `date` cells (`widgetProps.due`) both
  take the keys.
