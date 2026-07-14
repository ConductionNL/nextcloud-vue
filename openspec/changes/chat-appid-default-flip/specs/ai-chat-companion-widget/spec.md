# ai-chat-companion-widget Specification (delta)

## Purpose

Execute the deferred default flip of the AI Chat Companion's backend from
`openregister` to `hermiq` — the final widget-side step of hydra ADR-034
"Amendment 2026-07-05" and `SPECTR-NEXTCLOUD-PLAN.md` §7.4 step 5. The
`chat-appid-flip` change made the backend configurable and pinned the default to
`openregister` until Hermiq's engine and OpenRegister's compat window shipped;
both prerequisites are now merged (hermiq `lib/Service/Engine/*` + `engine.enabled`
flag; openregister #305 compat proxy).

## MODIFIED Requirements

### Requirement: Configurable chat backend app id

The AI Chat Companion SHALL resolve every chat, health, streaming, and
conversation HTTP call against a configurable backend app id rather than a
hardcoded slug. `@conduction/nextcloud-vue` SHALL expose a single
configuration module (`src/composables/aiChatConfig.js`) that owns:

- a `DEFAULT_CHAT_APP_ID` constant, and
- URL builders that derive each widget path from an app id
  (`chatApiBase`, `chatStreamUrl`, `chatSendUrl`, `chatHealthUrl`,
  `conversationsUrl`, `conversationMessagesUrl`).

`DEFAULT_CHAT_APP_ID` MUST be `hermiq` — the agent engine's canonical home per
ADR-034 Amendment 2026-07-05. `openregister` MUST remain a valid explicit
override (via the `chatAppId` prop chain) for deployments riding OpenRegister's
compat window. `CnAiCompanion`, `CnAiChatPanel`, and `CnAiHistoryDialog` MUST
each accept a `chatAppId` prop (default `DEFAULT_CHAT_APP_ID`), and
`useAiChatStream()` MUST accept an `options.chatAppId` (default
`DEFAULT_CHAT_APP_ID`). An empty or nullish app id MUST fall back to
`DEFAULT_CHAT_APP_ID` rather than produce a malformed `/apps//api` path.

#### Scenario: Default backend is Hermiq

- **GIVEN** a consuming app that mounts `CnAiCompanion` without setting `chatAppId`
- **WHEN** the widget issues its health probe, chat stream, non-streaming
  fallback, conversation-list, and conversation-messages requests
- **THEN** every request targets `/index.php/apps/hermiq/api/...`

#### Scenario: Overriding the backend routes every call to it

- **GIVEN** a consuming app that sets `chatAppId` to `openregister`
- **WHEN** the widget issues its health probe, chat stream, non-streaming
  fallback, conversation-list, and conversation-messages requests
- **THEN** every request targets `/index.php/apps/openregister/api/...` and no
  request targets `hermiq`

#### Scenario: Empty backend id degrades to the default

- **GIVEN** a mis-wired `chatAppId` that is an empty string or nullish
- **WHEN** a widget URL is built from it
- **THEN** the URL falls back to the `DEFAULT_CHAT_APP_ID` base
  (`/index.php/apps/hermiq/api/...`) rather than `/index.php/apps//api/...`

#### Scenario: useAiChatStream targets the option-supplied backend

- **GIVEN** `useAiChatStream(instance, { chatAppId: 'openregister' })`
- **WHEN** `send()` opens the SSE stream, the non-streaming fallback POSTs, and
  `loadConversation(uuid)` GETs a conversation's messages
- **THEN** the stream URL is `/index.php/apps/openregister/api/chat/stream`, the
  fallback URL is `/index.php/apps/openregister/api/chat/send`, and the messages
  URL is `/index.php/apps/openregister/api/conversations/{uuid}/messages`

### Requirement: App-level chat backend configuration point

`CnAppRoot` SHALL accept a `chatAppId` prop (default `DEFAULT_CHAT_APP_ID`) and
forward it to the auto-mounted `<CnAiCompanion>`, so a consuming app configures
the chat backend in exactly one place. `chatAppId` MUST be independent of the
consuming app's own `appId`: the chat backend is a fleet-shared service, so it
defaults to `DEFAULT_CHAT_APP_ID` and never to the host app's slug.

#### Scenario: CnAppRoot forwards the backend to the companion

- **GIVEN** a consuming app that mounts `<CnAppRoot :app-id="'pipelinq'" :ai-companion="true" :chat-app-id="'openregister'">`
- **WHEN** `CnAppRoot` auto-mounts the AI companion
- **THEN** `<CnAiCompanion>` receives `chatAppId = 'openregister'` and its
  requests target `/index.php/apps/openregister/api/...`, while the host app id
  (`pipelinq`) is unaffected

#### Scenario: Default when CnAppRoot sets no chatAppId

- **GIVEN** a consuming app that mounts `<CnAppRoot :app-id="'pipelinq'" :ai-companion="true">` with no `chatAppId`
- **WHEN** `CnAppRoot` auto-mounts the AI companion
- **THEN** `<CnAiCompanion>` receives `chatAppId = 'hermiq'` (the default)
