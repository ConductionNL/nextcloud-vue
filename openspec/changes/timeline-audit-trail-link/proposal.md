# Proposal: timeline-audit-trail-link

## Why

DqZaakHistorie ends the case history with "Volledige audit trail in de zijbalk" next to the event count: the timeline
holds what was recorded, the sidebar's audit trail holds every change, and the board points from the one to the other.
The manage timeline drew the count and nothing else, so a handler had to know the sidebar tab existed.

## What changes

Opt-in content key `auditTrailLink` on the manage timeline (`true` for the library words, or a label). It draws a link
button beside the count that opens the object sidebar on its audit trail tab through the shared `objectSidebarState`;
`auditTrailTab` names that tab when a page declares it under its own id.
Without an object sidebar on the page the link is not drawn.
