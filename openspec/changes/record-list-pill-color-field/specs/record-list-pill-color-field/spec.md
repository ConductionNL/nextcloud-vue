# record-list-pill-color-field Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A record list pill can take its tone from the row

A record list pill MAY declare `colorField`, a path to a colour name on the row. When `colorMap` names no tone for the value, the pill SHALL take the tone of that colour (purple, teal, blue, green, orange, red, grey and their light tints, or a badge role).

#### Scenario: DqMijnWerk Verder werken

- **GIVEN** a case whose status type colour is purple
- **THEN** its "In behandeling" pill is the purple badge
