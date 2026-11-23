# Proposal: facts-lead-person-chip

## Why

DqTenant's "Beheerder" card draws the administrator as a person chip: a 28px round teal tile with the initials "MV",
8px from "Marieke Visser" in the normal weight, and the e-mail address under it. The card reads the tenant's admin user
by user id, so the facts card could show the name (`format: "user"`) but a lead's initials came only from a path on the
record, and the lead tile was always 40px with a bold title.

## What changes

A facts `lead` takes `size` (the tile in px; under 32 it is a person chip: 12px initials, 8px from the name, the name in
the normal weight), `initialsFrom: "title"` (the initials of the name the lead shows) and the `teal` tone. Without them
nothing changes.

## Scope

CnFactsWidget, look-board-detail.css. No schema change.
