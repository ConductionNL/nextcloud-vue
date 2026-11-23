# conversation-source Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [conversation-reply-option](../../)

## ADDED Requirements

### Requirement: A reply can carry a hint and an option

A conversation with `replyHint` SHALL show it beside the reply label. With `replyOption` (`{ label, key, value? }`) it
SHALL draw a switch under the reply box, on unless `value` is false, and send `{ [key]: state }` with the reply: as the
second argument of `send`, in an endpoint post's body, and in a `replyAction`'s `args[0]` and `props`.

#### Scenario: DqZaakContact

- **GIVEN** the reply option "Vastleggen als contactmoment op deze zaak" with key `logContactMoment`
- **WHEN** the handler answers with the switch on
- **THEN** the portal message dialog opens with `logContactMoment: true` beside the text
