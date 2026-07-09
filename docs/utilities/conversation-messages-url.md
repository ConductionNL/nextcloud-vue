# conversationMessagesUrl

`conversationMessagesUrl(appId?, conversationUuid)` returns the endpoint
(`GET`) for the messages of a single AI Chat Companion conversation —
`{chatApiBase}/conversations/{conversationUuid}/messages`.

```js
import { conversationMessagesUrl } from '@conduction/nextcloud-vue'

conversationMessagesUrl('openregister', 'abc-123')
// '/index.php/apps/openregister/api/conversations/abc-123/messages'
```

Derived from [`chatApiBase`](./chat-api-base.md); `appId` falls back to
[`DEFAULT_CHAT_APP_ID`](./default-chat-app-id.md). For the conversation
list, see [`conversationsUrl`](./conversations-url.md).

Source: `src/composables/aiChatConfig.js` (ADR-034).
