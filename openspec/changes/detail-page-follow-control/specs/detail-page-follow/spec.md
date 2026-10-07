# detail-page-follow Specification

## Purpose

A user can follow a record from its detail page and get its updates, and a
team lead can see and change who follows it. The data and the rights live in
OpenRegister (`2026-10-05-object-watchers`); this capability is the control.

## ADDED Requirements

### Requirement: A detail page offers Follow to anyone who may read the record

`CnDetailPage` SHALL render `CnFollowButton` in its header actions when the
page config sets `follow: true`, or when `follow` is omitted and the loaded
object carries `@self.watching`. The button SHALL read "Follow" when
`@self.watching` is false and "Following" when it is true, with
`aria-pressed` reflecting the state. A page with `follow: false`, or an
object without `@self.watching` and no `follow: true`, SHALL render no button.

#### Scenario: A colleague follows a ticket

- **GIVEN** a pipelinq ticket detail page whose object has `@self.watching: false`
- **WHEN** the user clicks Follow
- **THEN** the library SHALL send `PUT /apps/openregister/api/objects/{register}/{schema}/{id}/watch`
- **AND** the button SHALL read Following with `aria-pressed="true"` before the response arrives
- **AND** the store's copy of the object SHALL carry `@self.watching: true`

#### Scenario: Unfollow

- **GIVEN** an object with `@self.watching: true`
- **WHEN** the user clicks Following
- **THEN** the library SHALL send `DELETE .../watch` and the button SHALL read Follow

#### Scenario: The call fails and the button rolls back

- **GIVEN** an object with `@self.watching: false`
- **WHEN** the user clicks Follow and the server answers 500
- **THEN** the button SHALL read Follow again
- **AND** an error toast SHALL say the record could not be followed

#### Scenario: Read access was lost

- **GIVEN** a detail page loaded while the user could read the object
- **WHEN** the user clicks Follow and the server answers 404
- **THEN** the button SHALL stay off and a toast SHALL say the user can no longer see this record

#### Scenario: Turned off in the manifest

- **GIVEN** a detail page config with `follow: false`
- **WHEN** the page renders an object with `@self.watching`
- **THEN** no Follow button SHALL render

@e2e include Open a detail page on an OpenRegister object; click Follow; assert the PUT and the pressed state; reload; assert Following; click again; assert the DELETE.

### Requirement: A user who may update the record sees who follows it

When the detail read reports `@self.can.update === true`, the button SHALL
fetch `GET .../watchers` once per page load and SHALL show the follower count
beside its label. Opening the count SHALL show a popover listing each
follower with avatar, display name and the date they started following. A
403 or any error on that call SHALL hide the count and SHALL NOT show an
error toast. A user without `update` SHALL see no count and the library
SHALL NOT call the watchers list.

#### Scenario: A team lead sees two followers

- **GIVEN** an object with `@self.can.update: true` whose watchers list returns two users
- **WHEN** the page renders
- **THEN** the button SHALL show the count 2
- **AND** opening it SHALL list both users with the date each started following

#### Scenario: A reader sees no count

- **GIVEN** an object with `@self.can.update: false`
- **WHEN** the page renders
- **THEN** no count SHALL render and no request to `.../watchers` SHALL be made

#### Scenario: The server refuses the list

- **GIVEN** an object with `@self.can.update: true` and a watchers call that answers 403
- **WHEN** the page renders
- **THEN** the button SHALL render without a count and no toast SHALL appear

#### Scenario: Following updates the count

- **GIVEN** a user with update who sees the count 2 and is not following
- **WHEN** the user clicks Follow and the call succeeds
- **THEN** the count SHALL read 3 and the popover SHALL list the user

### Requirement: A user who may manage the record can add and remove a colleague

When the detail read reports `@self.can.manage === true`, the followers
popover SHALL offer an "Add a colleague" user picker (`NcSelect` with
`inputLabel`, searching Nextcloud users) and a remove action on each
follower. Adding SHALL send `PUT .../watchers/{userId}`; removing SHALL send
`DELETE .../watchers/{userId}`. A 400 or 403 SHALL keep the popover open and
show the server's message beside the picker. Without `manage`, the popover
SHALL offer a remove action only on the user's own row.

#### Scenario: A team lead adds a colleague

- **GIVEN** an object with `@self.can.manage: true` and a popover listing one follower
- **WHEN** the team lead picks the user "jan" in Add a colleague
- **THEN** the library SHALL send `PUT .../watchers/jan`
- **AND** the popover SHALL list two followers and the count SHALL read 2

#### Scenario: An unknown user is refused

- **GIVEN** the same popover
- **WHEN** the server answers 400 with message "Unknown user"
- **THEN** the popover SHALL stay open and show "Unknown user" beside the picker

#### Scenario: No manage, no picker

- **GIVEN** an object with `@self.can.update: true` and no `@self.can.manage`
- **WHEN** the user opens the followers popover
- **THEN** no Add a colleague picker SHALL render
- **AND** only the user's own row SHALL carry a remove action

@e2e include As a user with manage, open the followers popover; add a colleague; assert the PUT and the new row; remove the colleague; assert the DELETE.

### Requirement: The follow key is declared in the manifest schema

The v2 manifest schema SHALL accept `config.follow` on `type: detail` pages
as a boolean. Omitting it SHALL mean automatic as described above.
`follow: true` on an object without `@self.watching` SHALL render the button
and log one console warning naming the page id.

#### Scenario: A manifest with follow validates

- **GIVEN** a manifest whose detail page config carries `follow: false`
- **WHEN** the manifest is validated
- **THEN** validation SHALL pass

#### Scenario: A wrong type is refused

- **GIVEN** a detail page config with `follow: "yes"`
- **WHEN** the manifest is validated
- **THEN** validation SHALL fail naming `follow`
