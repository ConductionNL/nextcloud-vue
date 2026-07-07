# chatApiBase

`chatApiBase(appId?)` returns the base API path for the AI Chat Companion
backend app — `/index.php/apps/{appId}/api`. It is the single point every
other `chat*Url` / `conversation*Url` builder derives its path from, so
switching the chat/agent backend is a single value change (the `chatAppId`
prop on `CnAppRoot` / `CnAiCompanion`, or the library default).

```js
import { chatApiBase } from '@conduction/nextcloud-vue'

chatApiBase()            // '/index.php/apps/openregister/api'
chatApiBase('hermiq')    // '/index.php/apps/hermiq/api'
```

`appId` falls back to [`DEFAULT_CHAT_APP_ID`](./default-chat-app-id.md)
when empty/nullish, so a mis-wired prop never produces `/apps//api`.

See also: [`chatStreamUrl`](./chat-stream-url.md),
[`chatSendUrl`](./chat-send-url.md),
[`chatHealthUrl`](./chat-health-url.md),
[`conversationsUrl`](./conversations-url.md),
[`conversationMessagesUrl`](./conversation-messages-url.md).

Source: `src/composables/aiChatConfig.js` (ADR-034).
