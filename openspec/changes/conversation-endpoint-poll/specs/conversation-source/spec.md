# conversation-source Specification (delta)

## ADDED Requirements

### Requirement: A conversation reads its messages from an endpoint and reads them again

The `conversation` widget SHALL accept `source: { url, responsePath? }` and read its messages from that endpoint, with
`@objectId` and `@object.<path>` filled in anywhere in the url; a url whose token has no value SHALL send no request.
With `pollSeconds` of 2 or more it SHALL read the source again on that interval while it is shown, without showing the
loading state, and SHALL keep the last messages when a poll fails. With `pollUntil: { path, in }` it SHALL stop polling
once the endpoint's answer holds one of those values at `path`. It SHALL stop polling when it is removed, and SHALL read
an endpoint source again after a reply through `endpoint`.

#### Scenario: A live chat shows new messages
- **GIVEN** a ticket's conversation widget with `source.url` naming the chat and `pollSeconds: 3`
- **WHEN** the colleague's answer is stored three seconds later
- **THEN** the thread shows it without a reload

#### Scenario: The chat ended
- **GIVEN** `pollUntil: { "path": "status", "in": ["closed"] }`
- **WHEN** the endpoint answers with `status: closed`
- **THEN** the widget reads it no more
