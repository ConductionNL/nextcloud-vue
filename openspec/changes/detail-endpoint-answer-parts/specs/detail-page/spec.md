# detail-page Delta: detail-endpoint-answer-parts

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A detail page over an app endpoint keeps the other parts of the answer

A detail page with `entitySource: "endpoint"` SHALL put every part of the answer named in `sourceConfig.attach`
(record key to dot-path in the answer) on the record it read at `recordPath`. A path the answer does not hold SHALL be
left out, so a field of the record keeps its value. An `attach` that is not a map SHALL be ignored. An answer without a
record SHALL still show the not-found state, whatever parts it holds.

#### Scenario: A report with its thread

- **GIVEN** a detail page with `sourceConfig` `{ url: "/apps/x/api/reports/{id}", recordPath: "report", attach: { messages: "messages" } }`
- **AND** the endpoint answers `{ report: { id: "r1" }, messages: [{ id: "m1" }] }`
- **WHEN** the handler opens report r1
- **THEN** the record is `{ id: "r1", messages: [{ id: "m1" }] }` and a `conversation` widget on `field: "messages"` shows m1

### Requirement: A conversation reply is posted under the endpoint's own field

A conversation with an `endpoint` SHALL post the reply text under `messageKey` (`message` by default), beside its
payload and its reply option. When the endpoint's answer does not echo the text, the conversation widget SHALL ask the
page to read the record again (`cn:page:refresh`); an echoed text SHALL show at once without a second read.

#### Scenario: A reply visible to the reporter

- **GIVEN** a conversation widget with `messageKey: "body"` and the reply option `{ key: "visibleToReporter" }`
- **WHEN** the handler sends "We looked into it." with the option on
- **THEN** the endpoint receives `{ body: "We looked into it.", visibleToReporter: true }`
- **AND** the page reads the record again, so the stored reply shows in the thread
