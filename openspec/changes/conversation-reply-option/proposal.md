# Proposal: conversation-reply-option

## Why

DqZaakContact's reply box says where the answer goes ("Gaat naar de berichtenbox in Mijn Zuiddrecht") and has a switch,
"Vastleggen als contactmoment op deze zaak", so an answer to the resident is also logged as a contact moment. The thread
had neither.

## What changes

- Thread: `replyHint` beside the reply label; `replyOption` (`{ label, key, value? }`) as a switch under the box, on
  unless `value` is false. `send` carries `{ [key]: state }` after the text, and an endpoint post carries it in its body.
- Widget: `content.replyHint` and `content.replyOption` (label through the app's translate); the state reaches the
  `replyAction` in `args[0]` and `props`.

## Scope

Additive. `send` gains a second argument, `{}` without an option.
