# Proposal: soon-date-format

## Why

Board PqDashboard's Terugbelverzoeken says when each callback is due the way people say it: "13:00" for today,
"morgen", "Woensdag" later this week. `{path|relativetime}` reads "vandaag, 13.00" and then a short date, and
`{path|ago}` looks back, not ahead.

## What changes

- `formatSoon` in utils/boardDate.js and the template format `{path|soon}`: the time of day for today, "tomorrow"
  (and "yesterday"), the weekday for two to six days ahead, and the board's short date for any other day.
- The start card (`workspace-filter` `layout: "start"`) carries the card's inner spacing and the board's gaps, as
  PqDashboard's "Contact starten" draws them; it is the card's whole body.
