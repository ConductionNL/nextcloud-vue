# record-favourite-follow Specification

## Purpose

A user stars a record, follows it for its updates, and finds both again in
any list. A team lead sees and changes who follows a record. The state and
the rights are OpenRegister's (`favourites-and-recent`, `object-watchers`);
this capability is the library's controls.

## ADDED Requirements

### Requirement: A record carries a star bound to its favourite marker

`CnFavouriteToggle` SHALL render a star, filled when the object's
`@self.favourite` is true, with `aria-pressed` reflecting it. A click SHALL
flip the star at once and send `PUT` (to star) or `DELETE` (to unstar)
`/apps/openregister/api/objects/{register}/{schema}/{id}/favourite`, and on
failure SHALL flip it back and show the server's message. `CnDetailPage`
SHALL render it beside the title when the object carries `@self.favourite`
and the page config does not set `favourite: false`.

#### Scenario: A user stars a record

- **GIVEN** a detail page whose object has `@self.favourite: false`
- **WHEN** the user clicks the star
- **THEN** `PUT .../favourite` SHALL be sent and the star SHALL show filled before the response arrives
- **AND** the store's copy of the object SHALL carry `@self.favourite: true`

#### Scenario: A failed star reverts

- **GIVEN** an unstarred record
- **WHEN** the user clicks the star and the server answers 500 with a message
- **THEN** the star SHALL show empty again and the message SHALL be shown

#### Scenario: Turned off

- **GIVEN** a detail page config with `favourite: false`
- **WHEN** the page renders an object with `@self.favourite`
- **THEN** no star SHALL render

@e2e include Open a detail page; click the star; assert the PUT and the filled state; reload; assert still filled.

### Requirement: A record carries a Follow toggle bound to its watching marker

`CnFollowToggle` SHALL read "Follow" when `@self.watching` is false and
"Following" when true, with `aria-pressed` reflecting it. A click SHALL flip
it at once and send `PUT` or `DELETE .../watch`, and on failure SHALL flip it
back and show the server's message; on a 404 it SHALL say the user can no
longer see this record and emit `not-found`. With the prop `notifies: false`
its tooltip SHALL say that following adds the record to the Following list
and sends no change notifications. `CnDetailPage` SHALL render it beside the
star when the object carries `@self.watching` and the page config does not
set `follow: false`.

#### Scenario: A colleague follows a ticket

- **GIVEN** a pipelinq ticket detail page whose object has `@self.watching: false`
- **WHEN** the user clicks Follow
- **THEN** `PUT /apps/openregister/api/objects/{register}/{schema}/{id}/watch` SHALL be sent
- **AND** the toggle SHALL read Following with `aria-pressed="true"` before the response arrives

#### Scenario: Unfollow

- **GIVEN** an object with `@self.watching: true`
- **WHEN** the user clicks Following
- **THEN** `DELETE .../watch` SHALL be sent and the toggle SHALL read Follow

#### Scenario: A failed follow does not pretend

- **GIVEN** an object with `@self.watching: false`
- **WHEN** the user clicks Follow and the server answers with an error
- **THEN** the toggle SHALL read Follow again and show the server's message

#### Scenario: A register that sends no notifications says so

- **GIVEN** `CnFollowToggle` with `notifies: false`
- **WHEN** the user hovers or focuses it
- **THEN** the tooltip SHALL say the record will be listed under Following and no change notifications are sent

@e2e include Open a detail page on an OpenRegister object; click Follow; assert the PUT and the pressed state; reload; assert Following; click again; assert the DELETE.

### Requirement: An editor sees who follows the record

When the object carries `@self.watcherCount`, `CnFollowToggle` SHALL show
that number beside its label and SHALL open a followers popover on request.
Opening it SHALL fetch `GET .../watchers` and list each follower with
avatar, display name and the date they started following. A 403 or error on
that call SHALL close the popover without a toast. When `@self.watcherCount`
is absent the toggle SHALL show no count and SHALL NOT call the watchers
list. Following or unfollowing SHALL move the shown count by one.

#### Scenario: A team lead sees two followers

- **GIVEN** an object with `@self.watcherCount: 2`
- **WHEN** the team lead opens the followers popover
- **THEN** `GET .../watchers` SHALL be sent and both users SHALL be listed with the date each started following

#### Scenario: A reader sees no count

- **GIVEN** an object without `@self.watcherCount`
- **WHEN** the page renders
- **THEN** no count SHALL render and no request to `.../watchers` SHALL be made

#### Scenario: Following moves the count

- **GIVEN** an object with `@self.watcherCount: 2` and `@self.watching: false`
- **WHEN** the user clicks Follow and the call succeeds
- **THEN** the count SHALL read 3

### Requirement: A manager adds and removes a colleague

When the object carries `@self.can.manage === true`, the followers popover
SHALL offer an "Add a colleague" user picker (`NcSelect` with `inputLabel`)
and a remove action on each follower. Adding SHALL send
`PUT .../watchers/{userId}`; removing SHALL send `DELETE .../watchers/{userId}`.
A 400 or 403 SHALL keep the popover open and show the server's message beside
the picker. Without `manage`, the popover SHALL offer a remove action only on
the current user's own row.

#### Scenario: A team lead adds a colleague

- **GIVEN** an object with `@self.can.manage: true` and a popover listing one follower
- **WHEN** the team lead picks the user "jan"
- **THEN** `PUT .../watchers/jan` SHALL be sent and the popover SHALL list two followers

#### Scenario: An unknown user is refused

- **GIVEN** the same popover
- **WHEN** the server answers 400 "Unknown user"
- **THEN** the popover SHALL stay open and show "Unknown user" beside the picker

#### Scenario: No manage, no picker

- **GIVEN** an object with `@self.watcherCount` and no `@self.can.manage`
- **WHEN** the user opens the popover
- **THEN** no picker SHALL render and only the user's own row SHALL carry a remove action

### Requirement: Index pages offer a star column and personal lenses

`CnIndexPage` SHALL accept `showFavouriteColumn` (default `false`), which
adds a first column rendering `CnFavouriteToggle` per row without opening
the row, and `personalLenses` (default `[]`), a list of `favourite`, `recent`
and `watching` that appends quick filters Favourites `{_favourite: true}`,
Recent `{_recent: true}` and Following `{_watching: true}` after the page's
own quick filters. A lens SHALL combine with every other filter. While Recent
is active, column sorting SHALL be disabled. The v2 manifest schema SHALL
accept `showFavouriteColumn`, `personalLenses`, and the detail page keys
`favourite` and `follow` as booleans.

#### Scenario: My favourite open requests

- **GIVEN** an index page with `personalLenses: ["favourite"]` filtered on status `open`
- **WHEN** the user turns on Favourites
- **THEN** the list query SHALL carry `_favourite=true` and `status=open`

#### Scenario: Recent owns the order

- **GIVEN** an index page with `personalLenses: ["recent"]`
- **WHEN** the user turns on Recent
- **THEN** the list query SHALL carry `_recent=true` and the column headers SHALL NOT offer sorting

#### Scenario: Starring from the list

- **GIVEN** an index page with `showFavouriteColumn: true`
- **WHEN** the user clicks a row's star
- **THEN** `PUT .../favourite` SHALL be sent for that row and the detail page SHALL NOT open

#### Scenario: A wrong manifest type is refused

- **GIVEN** a detail page config with `follow: "yes"`
- **WHEN** the manifest is validated
- **THEN** validation SHALL fail naming `follow`
