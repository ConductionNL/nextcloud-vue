# notification-preferences Delta: notification-preferences-ui

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notification-preferences-ui](../../)

## Purpose

One screen where a person chooses which events notify them and over which
channel, with a group default beside it and a digest over the top. Round
4 discovery cluster 10, candidates C-communication-29, C-communication-46,
C-communication-34 and C-communication-47. Consumed by dossiq and by
every app that notifies anybody.

## ADDED Requirements

### Requirement: A person chooses which events notify them and over which channel

`CnNotificationPreferences` SHALL render the host's event catalogue as
rows and the host's channel list as columns, with a value in each cell.
The component SHALL NOT define events or channels of its own. A channel
the instance has not configured SHALL render disabled with the reason.
Events SHALL group by the app's own categories, groups SHALL collapse,
and a whole row or column SHALL be settable at once. The matrix SHALL be
exposed as a table with row and column headers.

#### Scenario: Everything in the app, mail only for a term

- **GIVEN** a handler on the preferences screen
- **WHEN** they switch the in-app column on for every event and mail on only for "term expires"
- **THEN** those values are stored and the screen reflects them on reload

#### Scenario: A channel nobody configured

- **GIVEN** an instance with no webhook transport configured
- **WHEN** the screen renders
- **THEN** the webhook column is disabled and states why

#### Scenario: Two hundred cells stay readable

- **GIVEN** a catalogue of forty events in six categories
- **WHEN** the screen renders
- **THEN** the categories are collapsed groups, and a category row sets all its events at once

### Requirement: The screen says where each value came from

Values SHALL resolve from the app default, then the group value an
administrator set, then the user's own, with the narrowest set value
winning. Each cell SHALL state which level its current value came from. A
cell the user has not set SHALL say it follows the group or the default.
The store SHALL read and write through OpenRegister and SHALL keep no
copy beyond the page.

#### Scenario: Why am I getting this

- **GIVEN** a user receiving a notification they did not switch on
- **WHEN** they open the screen and look at that cell
- **THEN** the cell says the value came from their group, or from the app default

#### Scenario: A personal value wins

- **GIVEN** a group default of on for an event
- **WHEN** the user switches that cell off
- **THEN** the user's value applies and the cell says it is theirs

### Requirement: A preference is set for one case domain or record type

A row SHALL be settable globally or for one case domain or record type.
Scoped rows SHALL render indented under their global row, and a scope
SHALL be added from the row itself. The narrower setting SHALL win. The
same component placed in admin settings SHALL write the group's defaults
and SHALL state that a user's own value wins over them. Preferences for
events no longer in the catalogue SHALL NOT be listed and SHALL be pruned
on the next write.

#### Scenario: Loud about bezwaren, quiet about the rest

- **GIVEN** a user who wants mail only for the bezwaar case domain
- **WHEN** they switch mail off globally and on for that domain
- **THEN** they receive mail for bezwaren and for nothing else

#### Scenario: An administrator sets a team's default

- **GIVEN** an administrator on the admin settings screen for a group
- **WHEN** they switch the term warning on for that group
- **THEN** every member of the group who has not set that cell receives it, and the screen says a personal value would win

#### Scenario: An event that no longer exists

- **GIVEN** stored preferences for an event the app has removed
- **WHEN** the screen renders and the user saves
- **THEN** the removed event is not listed and its stored preference is pruned

### Requirement: Mail is batched into a digest a person chooses

A user SHALL be able to set a digest per channel: off, daily or weekly,
with a time of day. Events the app marks immediate SHALL never be held in
a digest, and the screen SHALL name them. A test send SHALL be offered
per channel, delivering to the person on the screen and reporting the
result.

#### Scenario: One mail a day instead of three hundred

- **GIVEN** a handler on forty cases
- **WHEN** they set the mail digest to daily at 08:00
- **THEN** their notification mail arrives as one message at that time

#### Scenario: A term warning is not held

- **GIVEN** an app marking the term warning as immediate
- **WHEN** the user sets a weekly digest
- **THEN** the term warning still arrives at once, and the screen lists it as immediate

#### Scenario: The channel is proved before it is needed

- **GIVEN** a user who has just switched mail on
- **WHEN** they press test send on the mail channel
- **THEN** a test message is delivered to them and the screen reports whether it succeeded
