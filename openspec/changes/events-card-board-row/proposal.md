---
kind: code
---

# Proposal: events-card-board-row

## Summary

Board DqTaak Afspraken draws the hearing row as "Hoorzitting bezwaar parkeerboete", then "21 okt, 14:00 tot 15:00 · Stadskantoor, zaal 2.04 · Fatima El-Amrani", with an "Uitgenodigd" pill at the end. Live wrote "30-10-2026, 14:00:00 - 30-10-2026, 15:00:00 · Stadskantoor, zaal 2.04", with no invitee and no pill (r32 structure).

## What changes

- An appointment on one day reads as the board short date plus its hours: "21 okt, 14:00 tot 15:00". Other spans keep the full moments.
- The row names its invitees after the place (`eventAttendeeNames`).
- The row ends in the status pill of the event, or of where its invitees stand (`eventStatusLabel` and `eventStatusVariant`, shared with the calendar card).
- `inviteeAnswer` also reads an attendee's `status: "invited"` (as an appointment part writes it) as still to answer.

## Scope

`src/components/CnEventsCard/CnEventsCard.vue`, `src/integrations/builtin/calendar/eventStatus.js`, `src/css/look-board-detail.css`.
