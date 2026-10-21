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
