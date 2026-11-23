# An appointment shows where its invitees stand

## Why
DqZaakTaken "Afspraken" draws an "Uitgenodigd" pill on an appointment that the reader has not yet answered. The calendar card took its pill only from the event's own STATUS, which a plain appointment does not carry.

## What changes
When an event has no status, its pill reads the invitees' answers:
- a decline first;
- then "Uitgenodigd" while someone has still to answer;
- then a tentative answer;
- "Geaccepteerd" when all accepted.

The invitee names were already read; they now come from OpenRegister's linked events (openregister feat/linked-events-carry-attendees).
