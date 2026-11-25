# Proposal: conversation-reply-endpoint-tokens

## Why

pipelinq's website chat reads its transcript through `source.url` with `@object.inboundThreadKey`, because the chat's
routes are keyed by the conversation, not by the ticket. The reply box's `endpoint` fills only `@objectId`, so the
reply cannot reach the same conversation route.

## What changes

- `endpoint` fills `@object.<path>` from the record as `source.url` does. A url whose `@object.` token has no value
  posts nowhere.

An `endpoint` with only `@objectId` behaves as before.
