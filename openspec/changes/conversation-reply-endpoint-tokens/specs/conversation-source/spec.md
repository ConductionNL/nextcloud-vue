# conversation-source (delta)

## ADDED Requirements

### Requirement: The reply endpoint is filled from the record like the source

The `conversation` widget's reply `endpoint` MUST fill `@objectId` and `@object.<path>` from the bound record, the same
way `source.url` does. When an `@object.` token in the endpoint has no value, the reply box MUST NOT post.

#### Scenario: A reply goes to the conversation the record names
- GIVEN a conversation widget with `endpoint` `/apps/pipelinq/api/web-chat/conversations/@object.threadKey/reply`
- AND the record's `threadKey` is `conversation:abc`
- WHEN the user sends "Thank you"
- THEN the widget posts to `/apps/pipelinq/api/web-chat/conversations/conversation%3Aabc/reply`

#### Scenario: A record without the value posts nowhere
- GIVEN the same widget on a record without `threadKey`
- WHEN the widget is shown
- THEN its reply endpoint is empty and nothing is posted

#### Scenario: An endpoint with only the record id is unchanged
- GIVEN `endpoint` `/api/tickets/@objectId/reply` on record `ticket-1`
- THEN the widget posts to `/api/tickets/ticket-1/reply`
