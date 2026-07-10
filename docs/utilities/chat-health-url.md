# chatHealthUrl

`chatHealthUrl(appId?)` returns the AI Chat Companion's health-probe
endpoint (`GET`) — `{chatApiBase}/chat/health`. The widget renders nothing
on a non-2xx response.

```js
import { chatHealthUrl } from '@conduction/nextcloud-vue'

chatHealthUrl()         // '/index.php/apps/openregister/api/chat/health'
chatHealthUrl('hermiq') // '/index.php/apps/hermiq/api/chat/health'
```

Derived from [`chatApiBase`](./chat-api-base.md); `appId` falls back to
[`DEFAULT_CHAT_APP_ID`](./default-chat-app-id.md).

Source: `src/composables/aiChatConfig.js` (ADR-034).
