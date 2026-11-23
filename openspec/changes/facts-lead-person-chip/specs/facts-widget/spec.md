# facts-lead-person-chip Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A lead can be drawn as a person chip

A facts `lead` with `size` SHALL draw its tile at that size in px; under 32px it SHALL draw the initials at 12px, 8px
from the title, and the title in the normal weight. With `initialsFrom: "title"` the initials SHALL be those of the
title the lead shows, and `tone: "teal"` SHALL draw the tile on the teal tint in the teal ink.

#### Scenario: DqTenant Beheerder

- **GIVEN** a lead with title `{ path: "userRef", format: "user" }`, `initialsFrom: "title"`, `size: 28`, `tone: "teal"`
- **THEN** the card shows a 28px teal tile "MV" 8px from "Marieke Visser" in the normal weight
