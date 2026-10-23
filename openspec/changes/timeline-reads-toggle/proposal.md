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

The reads come from OpenRegister's object audit trail, which answers to
whoever may read the object (ObjectHistoryForReaders). This change shows
nothing that endpoint does not already answer. Restricting WHO may see reads
to certain roles is an OpenRegister rule, not a UI switch: see the design note
in the report (an OR setting naming the groups that see `read` events,
enforced in ObjectHistoryForReaders). The switch here is not an access control.
