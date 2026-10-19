# due-text-soon Delta: due-text-soon

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [due-text-soon](../../)

## Purpose

A deadline that is close reads in the warning colour, as board DqTeamwachtrij draws it.

## ADDED Requirements

### Requirement: A due date within a few days reads as soon

The due text SHALL take `soonWithin`, a number of days. With it, a due date today or at most that many days ahead
SHALL carry `soon: true`, and the date cell and the record list SHALL draw it in the warning colour. An overdue date
SHALL keep the danger tone. Without `soonWithin` the result SHALL be as before.

#### Scenario: Board DqTeamwachtrij

- **GIVEN** a `due` config with `soonWithin` 7
- **THEN** a deadline 3 days ahead reads in the warning colour, 10 days ahead in the plain colour, and 2 days overdue
  in the danger colour
