# CnAiChatWidget

The AI Chat Companion as a widget, `type: "ai-chat"`: the assistant in the page's own flow, as a detail page tab or a
card, instead of the launcher's floating window. It is `CnAiCompanion` with `embedded`: the same health probe, agents,
sessions and stream, always open, without the launcher hex and without the close button. The floating companion keeps
working beside it. Renders nothing when the chat backend does not answer.

The detail host draws it in its titled card (it is a content-only type). The panel then has no titlebar of its own: the
widget reports a pill for the card's title row and the session controls (new chat, conversations, read aloud, other
agents) as items of the card's Actions menu.

## Content

| Key | Type | Default | Description |
|---|---|---|---|
| `chatAppId` | `string` | `'hermiq'` | Backend app that answers the chat. |
| `pill` | `string` | `''` | A pill in the card's title row, e.g. the assistant's name ("Hermiq"). Translated. |
| `pillVariant` | `string` | `'purple'` | The pill's CnStatusBadge variant. |
| `note` | `string` | `''` | A line above the input, e.g. what the assistant can see. Translated. |
| `placeholder` | `string` | `''` | The input's placeholder; empty keeps "Message input". Translated. |
| `sendLabel` | `string` | `''` | A label on the send button instead of the send icon. Translated. |

## Example

```json
{ "id": "case-assistant-chat", "type": "ai-chat", "title": "Assistant" }
```
