# conversationsUrl

`conversationsUrl(appId?)` returns the AI Chat Companion's conversation-list
endpoint (`GET`) — `{chatApiBase}/conversations`.

```js
import { conversationsUrl } from '@conduction/nextcloud-vue'

conversationsUrl()         // '/index.php/apps/openregister/api/conversations'
conversationsUrl('hermiq') // '/index.php/apps/hermiq/api/conversations'
```

Derived from [`chatApiBase`](./chat-api-base.md); `appId` falls back to
[`DEFAULT_CHAT_APP_ID`](./default-chat-app-id.md). For a single
conversation's messages, see
[`conversationMessagesUrl`](./conversation-messages-url.md).

Source: `src/composables/aiChatConfig.js` (ADR-034).
