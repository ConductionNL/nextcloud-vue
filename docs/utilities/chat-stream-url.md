# chatStreamUrl

`chatStreamUrl(appId?)` returns the AI Chat Companion's SSE streaming
endpoint (`POST`) — `{chatApiBase}/chat/stream`.

```js
import { chatStreamUrl } from '@conduction/nextcloud-vue'

chatStreamUrl()         // '/index.php/apps/openregister/api/chat/stream'
chatStreamUrl('hermiq') // '/index.php/apps/hermiq/api/chat/stream'
```

Derived from [`chatApiBase`](./chat-api-base.md); `appId` falls back to
[`DEFAULT_CHAT_APP_ID`](./default-chat-app-id.md).

Source: `src/composables/aiChatConfig.js` (ADR-034).
