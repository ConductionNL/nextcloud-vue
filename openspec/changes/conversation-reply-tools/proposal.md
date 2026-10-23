## Why

pipelinq answered customers in four components that each did one thing the conversation widget lacked: merge a ticket's two message lists, pick a saved reply, tick "wait for the customer" with the answer, show a message's delivery status and send a failed one again.

## What changes

- `fields: [{ field, side }]` merges lists by time.
- `templates` puts CnTemplateSelect in the reply box (new thread slot `reply-tools`).
- `replyOptions` checkboxes are sent with the reply.
- `statusField`/`statusMap` and `messageActions` per message (new thread message keys `status` and `actions`, event `message-action`).

## Impact

No schema change. First consumer: pipelinq (PL-ABSTRACT lane PL1).
