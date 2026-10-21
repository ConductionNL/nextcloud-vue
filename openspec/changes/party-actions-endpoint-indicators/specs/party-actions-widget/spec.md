# party-actions-widget

## ADDED Requirements

### Requirement: Indicators can come from an endpoint and be acknowledged

An `indicatorSource` with `url` SHALL read the indicators of the party from that endpoint and show each with its tone, its `toneLabels` label and its `meta` line. With `ack`, an indicator whose `whenPath` is true and `donePath` empty SHALL offer the acknowledgement button, which posts to `endpoint` and reads the indicators again; an acknowledged one SHALL show the `seen` line. A failed acknowledgement SHALL show `errorText`.

#### Scenario: A warning that must be seen
- **GIVEN** an aggression warning that requires an acknowledgement
- **WHEN** the agent presses "I have seen this"
- **THEN** the acknowledgement is posted and the warning reads "Seen by <agent> on <date>"

### Requirement: Quick actions link a phone, an address and a mail address

An action target `@object.<field>|tel`, `|mailto` or `|geo` SHALL become that link to the record's value, and the action SHALL be left out when the value makes no link.

#### Scenario: Tap to call
- **GIVEN** a contact with phone "06 12 34 56 78"
- **THEN** the Call action opens `tel:0612345678`

### Requirement: Indicators that cannot be read say so, and are read again after a change

When `indicatorSource` cannot be read, the band SHALL show `indicatorSource.errorText` as an alert instead of the empty sentence, so a missing safety flag is never read as "no warnings". The band SHALL read the indicators again when an object is created or the page asks (`cn:page:refresh`). `indicatorActions` SHALL be drawn beside the indicators while any shows, as `emptyActions` are while none does.

#### Scenario: the warnings cannot be loaded
- GIVEN the indicator endpoint answers with an error
- THEN the band reads "The list of warnings could not be loaded." as an alert and not "No warnings on this record."

#### Scenario: a warning is added
- GIVEN the band shows one warning and an "Add a warning" action
- WHEN a warning is saved through that action
- THEN the band reads the indicators again and shows both

### Requirement: The manifest schema accepts the link targets

The manifest schema SHALL accept `@object.<field>|tel`, `|mailto` and `|geo` as tokens, and reject any other filter after `|`.

#### Scenario: a party page with Call and Directions
- GIVEN a manifest whose band has `@object.phone|tel` and `@object.address|geo` targets
- THEN the manifest validates
