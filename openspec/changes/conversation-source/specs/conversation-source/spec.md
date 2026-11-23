# conversation-source

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Draw a record's conversation from messages stored as their own objects.

## ADDED Requirements

### Requirement: A conversation reads its messages from a list and maps their parts

With `source` the `conversation` widget SHALL read the messages from that register list with the filter
token-resolved against the record, sending no request while a token resolves empty or not at all, and SHALL show a
loading state while it reads. Each message SHALL take its text, time, sender, direction and channel from the mapped
keys, its channel through `channelMap` and the app's translate, and the messages SHALL be shown oldest first. Each
message SHALL name its direction ("Sent message" or "Received message") for a screen reader.

#### Scenario: A case's messages

- **GIVEN** three messages of a case stored out of order, with directions, channels and senders
- **WHEN** the widget renders for that case
- **THEN** it requests the list with the case's id in the filter, and shows the messages oldest first with their channel labels and sides

### Requirement: A reply can run an app action

With `replyAction` the widget SHALL, on Send, dispatch that action with tokens resolved, `args: [{ text, objectId }]`
and `props.text`, post nothing to an endpoint, and read the list again afterwards.

#### Scenario: Answer the resident

- **GIVEN** a `replyAction` of type handler
- **WHEN** the user sends "We sent the documents."
- **THEN** the handler action is dispatched with that text and the record's id, and the list is read again
