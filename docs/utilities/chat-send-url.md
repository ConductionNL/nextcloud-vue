# chatSendUrl

`chatSendUrl(appId?)` returns the AI Chat Companion's non-streaming
fallback endpoint (`POST`) — `{chatApiBase}/chat/send`. Used when SSE
streaming is unavailable.

```js
import { chatSendUrl } from '@conduction/nextcloud-vue'

chatSendUrl()         // '/index.php/apps/openregister/api/chat/send'
chatSendUrl('hermiq') // '/index.php/apps/hermiq/api/chat/send'
```

Derived from [`chatApiBase`](./chat-api-base.md); `appId` falls back to
[`DEFAULT_CHAT_APP_ID`](./default-chat-app-id.md).

Source: `src/composables/aiChatConfig.js` (ADR-034).
