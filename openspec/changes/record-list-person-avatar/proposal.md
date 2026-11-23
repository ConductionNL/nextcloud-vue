# Proposal: record-list-person-avatar

## Why

Board PqOrganisatie draws the main contact as the record card's person
chip: 40px, the initials 16px bold on the grey ground, as DqOrganisatie
does. A record list in a detail page's side column forced its avatar to
the 28px light-primary circle, and `avatar.size` knew only 32.

## What changes

- `avatar.size: 40` marks the list `cn-record-list__list--avatar-person`:
  the 40px chip with 16px initials, 12px from the name.
- Under the board look the side column keeps that chip 40px on the grey
  ground instead of the 28px light-primary circle.
