# Proposal: nl-time-of-day-colon

## Why

Ruben decided (29 Oct 2026) that every app writes a time of day with a colon: "10:00", "10:00 tot 11:00". The
library's Dutch catalogue translated `{hours}:{minutes}` to `{hours}.{minutes}`, so every time `formatTimeOfDay` wrote
in Dutch ("vandaag, 09.42", "09.30 tot 12.00 uur", a record list's leading time) used a dot.

## What changes

- The Dutch catalogue writes `{hours}:{minutes}`. `formatTimeOfDay` already reads that string, so the relative date,
  the template tokens, the date tile and every widget that uses it follow.
- Tests and docs that quoted the dotted time now quote the colon.

No formatter hard-codes the dot: the `Intl` time formats in nl already write a colon. No schema change.
