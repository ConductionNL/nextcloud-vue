# connection-registry-page Delta: connection-registry-page

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [connection-registry-page](../../)

## Purpose

One page, the same in every app, shows the connections the app declares and how integriq found them.

## ADDED Requirements

### Requirement: The page lists one app's connections

A `type: "connections"` page SHALL mount `CnConnectionRegistry`, which SHALL read the `app_connection` objects of register `integriq` (both configurable) filtered on `app` = `config.app`, or on the route's `?app=` when the config names no app, and SHALL drop any returned row of another app. The cards SHALL be ordered by `order`.

#### Scenario: Opened without the query

- **GIVEN** pipelinq's Integrations page with `config.app: "pipelinq"`
- **WHEN** the route is opened directly, without `?app=pipelinq`
- **THEN** only pipelinq's ten connections are listed, not all 94

### Requirement: Status chips count and filter the cards

The page SHALL draw a group of toggle buttons (`aria-pressed`) reading All connections, Set up, Limited, Not set and Error, each with its count, and a text filter over title, description, kind and status message. A chip SHALL show only the cards of its status; All shows every card.

#### Scenario: One failing connection

- **WHEN** the administrator presses Error
- **THEN** only the Facebook page card shows

### Requirement: A connection is a status card

Each card SHALL show an icon, the title as a level-3 heading, "<kind> · checked <date>" or "never checked", a status chip, the description, the status message, and a button to its `settingsUrl` reading "Set up" for a connection not set up and "Open settings" otherwise, named after the connection; without a `settingsUrl` it SHALL read "No settings screen yet". Beside the cards an aside SHALL list the limited and failing connections with their message, the last check by integriq with a link to integriq, and where a connection is added.

#### Scenario: Bluesky not set up

- **THEN** its card reads "never checked", "Not set", its status message and a "Set up" button
