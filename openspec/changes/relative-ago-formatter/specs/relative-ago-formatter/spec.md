# relative-ago-formatter Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A template reads a past moment as how long ago it was

`{path|ago}` SHALL read a past moment as: "just now" under a minute, "{count} min ago" under an hour, "{count} hours
ago" under three hours, "this morning" (before 12:00), "this afternoon" (12:00 to 18:00) or "this evening" for the
rest of today, "yesterday", the weekday's full name for two to six days back, and the board's short date after that.
A future moment SHALL read as `{path|relative}` does. The words SHALL follow the user's language.

#### Scenario: DqMijnWerk Verder werken

- **GIVEN** it is Monday 5 October 2026, 14:30, and a Dutch reader
- **WHEN** the rows were opened at 14:20 today, at 09:10 today and on Friday 2 October
- **THEN** they read "10 min geleden", "vanochtend" and "vrijdag"
