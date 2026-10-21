# handoff-action

## ADDED Requirements

### Requirement: A record is handed to another app by config

A `handoff` widget SHALL read its `availability` endpoint and draw its action only when every `canPath` in the answer is `true`; otherwise, with nothing done and no fallback link, it SHALL render nothing (hidden, never disabled). Sending SHALL post the declared `fields` to the `action` url with `@objectId` / `@object.<field>` tokens resolved. After a send, or when the availability answers the done state, it SHALL show the done note, the reference and a link that is root-relative or http(s) only, and SHALL drop the button unless the action is `repeatable`. A mapped `results` status SHALL name the outcome; a mapped `errors` status SHALL name the refusal, and an entry with `reload: true` SHALL read the availability again.

#### Scenario: The action is not offered
- **GIVEN** the availability answers `canConvert: false`
- **THEN** nothing renders

#### Scenario: A record is converted
- **GIVEN** the availability answers `canConvert: true`
- **WHEN** the user presses the action
- **THEN** the action url is posted for this record
- **AND** the done note and the returned reference replace the button

#### Scenario: A refusal names its reason
- **WHEN** the action answers `status: invalid-status`
- **THEN** the mapped text shows and the availability is read again

### Requirement: A body section can be a library widget

A detail page body section (`config.bodyWidgets[]`) SHALL accept `type` (a library widget type) with `content` instead of `component`, and SHALL render that widget's renderer with its `content`, the page's `objectId` and the record, in the section's placement, title and card. A `component` SHALL win when both are given; an unknown type SHALL show the section's inline error.

#### Scenario: A handoff as a body section
- **GIVEN** a body section `{ "type": "handoff", "title": "Case", "content": { ... } }`
- **THEN** the handoff renders in that section for the page's record
