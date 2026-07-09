# DEFAULT_CHAT_APP_ID

`DEFAULT_CHAT_APP_ID` is the default chat/agent backend app id the AI Chat
Companion targets — currently `'openregister'`. Every
[`chatApiBase`](./chat-api-base.md)-derived URL builder falls back to it
when no `appId` is passed.

```js
import { DEFAULT_CHAT_APP_ID } from '@conduction/nextcloud-vue'

DEFAULT_CHAT_APP_ID // 'openregister'
```

The default is deliberately `openregister` (not `hermiq`) so consuming apps
keep working across the ADR-034 move of the agent engine into Hermiq;
deployments can point at another backend today via the `chatAppId` prop on
`CnAppRoot` / `CnAiCompanion`.

Source: `src/composables/aiChatConfig.js` (ADR-034).
