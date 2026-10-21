# conversation

## ADDED Requirements

### Requirement: A conversation merges several lists of the record

`fields: [{ field, side }]` SHALL merge the lists at those paths of the record, each message on its list's side, oldest first.

#### Scenario: A ticket's questions and answers
- **GIVEN** `portalReplies` on side them and `portalAnswers` on side us
- **THEN** the thread shows both, in time order

### Requirement: The reply box offers templates and options

`templates` SHALL put a template select above the reply box whose pick fills the box. `replyOptions` SHALL draw checkboxes at their defaults whose values are sent with the reply: in the endpoint's body, and as `options` to a `replyAction`.

#### Scenario: Wait for the customer
- **WHEN** the user unticks "wait for the customer" and sends "Hello"
- **THEN** the endpoint receives `{ waitForCustomer: false, message: "Hello" }`

### Requirement: A message carries its status and actions

`statusField` SHALL show each message's status, mapped by `statusMap`. `messageActions` SHALL draw a button on each message their `when` holds for; pressing it SHALL call the endpoint with the message's fields, then read the messages again, and SHALL show `errorText` when it fails.

#### Scenario: Send a failed message again
- **GIVEN** a message with delivery status failed
- **THEN** it shows "Failed" and a "Send again" button that posts to its resend endpoint

### Requirement: A conversation shows the latest thread status, and a status can open a follow-up

A conversation SHALL show, with `statusBadge`, the status of the most recent row of a list (the latest conversation thread) as a header badge. A message action's `onStatus` SHALL run the action named for the answer's status instead of showing the refusal.

#### Scenario: the latest thread is assigned
- GIVEN two threads, the most recent one assigned
- THEN the header reads "Assigned"

#### Scenario: the WhatsApp session closed
- WHEN Send again answers `template-required`
- THEN the composer opens on WhatsApp for a template, and no refusal shows
