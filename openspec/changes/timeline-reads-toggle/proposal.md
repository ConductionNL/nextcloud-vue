# Proposal: timeline-reads-toggle

## Why

Board DqZaakHistorie ends the case history with "10 van 10 gebeurtenissen,
alleen wijzigingen" and a switch "Ook wie de zaak las". Who opened a case is
on its audit trail (`read` events), not on its timeline, so the history could
not show it.

## What changes

`readsToggle` (`true` or a label) adds a footer switch, off by default. Switched
on, the history reads the object's audit trail for `read` events and puts them
among the entries ("Viewed", who, when, "Opened the record"), newest first, with
no actions; a "Viewed" chip filters them. While off, the count says "changes
only". A trail read that fails or is refused leaves the reads out.

## Access

OpenRegister gives `read` entries only to administrators and the groups the
setting `audit.readEventsVisibleTo` names, and says so in the history's
`readEventsVisible` (openregister `feat/audit-read-events-visible-to`). The
switch is offered only when that answer is true, so the offer follows the
server's rule; it is not an access control of its own.
