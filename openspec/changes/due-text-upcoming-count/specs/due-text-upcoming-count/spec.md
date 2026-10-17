# due-text-upcoming-count Delta: due-text-upcoming-count

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [due-text-upcoming-count](../../)

## Purpose

A deadline still to come can read as the time left, as board DqTeamwachtrij draws it.

## ADDED Requirements

### Requirement: A due date to come can read as the time left

The due text SHALL take `upcomingLabel` `{ one, other }` with `{count}`. With it, a date after today SHALL read the
label filled with the whole days left. With `upcomingWeeksLabel` `{ one, other }` as well, a date at least
`upcomingWeeksFrom` days ahead (default 35) SHALL read that label filled with the weeks left, rounded. The texts SHALL
go through the host's translate. Without `upcomingLabel` a date to come SHALL read as before.

#### Scenario: Board DqTeamwachtrij

- **GIVEN** a `due` config with `upcomingLabel` "nog {count} dag" / "nog {count} dagen" and `upcomingWeeksLabel`
  "nog {count} week" / "nog {count} weken"
- **THEN** a deadline 4 days ahead reads "nog 4 dagen", 28 days ahead "nog 28 dagen" and 56 days ahead "nog 8 weken"

#### Scenario: No upcoming label

- **GIVEN** a `due` config without `upcomingLabel`
- **THEN** a deadline 9 days ahead reads the short date
