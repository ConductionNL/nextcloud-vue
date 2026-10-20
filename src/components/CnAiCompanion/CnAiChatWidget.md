# CnAiChatWidget

The AI Chat Companion as a widget, `type: "ai-chat"`: the assistant in the page's own flow, as a detail page tab or a
card, instead of the launcher's floating window. It is `CnAiCompanion` with `embedded`: the same health probe, agents,
sessions and stream, always open, without the launcher hex and without the close button. The floating companion keeps
working beside it. Renders nothing when the chat backend does not answer.

## Content

| Key | Type | Default | Description |
|---|---|---|---|
| `chatAppId` | `string` | `'hermiq'` | Backend app that answers the chat. |

## Example

```json
{ "id": "case-assistant-chat", "type": "ai-chat", "title": "Assistant" }
```
