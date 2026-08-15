# Tasks: chat-appid-flip

## Implementation Tasks

## 1. Config module (single source of truth)

### Task 1.1: Create `aiChatConfig.js`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-configurable-chat-backend-app-id`
- **files**: `src/composables/aiChatConfig.js`, `src/composables/index.js`, `src/index.js`, `src/types/index.d.ts`
- **acceptance_criteria**:
  - Exports `DEFAULT_CHAT_APP_ID` equal to `'openregister'` (safe default; the `hermiq` flip is a deferred one-line change per ADR-034 Amendment 2026-07-05)
  - Exports `chatApiBase`, `chatStreamUrl`, `chatSendUrl`, `chatHealthUrl`, `conversationsUrl`, `conversationMessagesUrl` — each derives the full path from an app id
  - `chatApiBase('')` / a nullish app id falls back to `DEFAULT_CHAT_APP_ID` (never `/apps//api`)
  - Re-exported from the composables barrel and the top-level `src/index.js`; typed in `src/types/index.d.ts`
  - `npm run lint` passes
- [x] 1.1 Implement config module + barrel/type exports

## 2. Transport composable

### Task 2.1: Parameterize `useAiChatStream()`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-configurable-chat-backend-app-id`
- **files**: `src/composables/useAiChatStream.js`
- **acceptance_criteria**:
  - Accepts a second `options` arg with `chatAppId` (default `DEFAULT_CHAT_APP_ID`)
  - `STREAM_URL`, `SEND_URL`, and the `loadConversation()` messages URL are all built from the resolved `chatAppId` via the config builders
  - Backward compatible: `useAiChatStream(instance)` (one arg) still targets `openregister`
  - `npm run lint` passes
- [x] 2.1 Thread `chatAppId` through all three URLs

## 3. Components

### Task 3.1: `chatAppId` prop on `CnAiCompanion`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-configurable-chat-backend-app-id`
- **files**: `src/components/CnAiCompanion/CnAiCompanion.vue`
- **acceptance_criteria**:
  - New `chatAppId` prop, `type: String`, `default: DEFAULT_CHAT_APP_ID`
  - Health probe uses `chatHealthUrl(this.chatAppId)`
  - Passes `{ chatAppId: this.chatAppId }` into `useAiChatStream(this, ...)`
  - Forwards `:chat-app-id` to `CnAiChatPanel`
  - `npm run lint` passes
- [x] 3.1 Add prop + wire health probe / stream / panel

### Task 3.2: `chatAppId` prop on `CnAiChatPanel`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-configurable-chat-backend-app-id`
- **files**: `src/components/CnAiCompanion/CnAiChatPanel.vue`
- **acceptance_criteria**:
  - New `chatAppId` prop (default `DEFAULT_CHAT_APP_ID`), forwarded to `CnAiHistoryDialog`
  - `npm run lint` passes
- [x] 3.2 Add prop + forward to history dialog

### Task 3.3: `chatAppId` prop on `CnAiHistoryDialog`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-configurable-chat-backend-app-id`
- **files**: `src/dialogs/CnAiHistoryDialog.vue`
- **acceptance_criteria**:
  - New `chatAppId` prop (default `DEFAULT_CHAT_APP_ID`)
  - Conversation-list fetch uses `conversationsUrl(this.chatAppId)`
  - `npm run lint` passes
- [x] 3.3 Add prop + wire conversation-list URL

### Task 3.4: `chatAppId` prop on `CnAppRoot` (app-level choke point)
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-app-level-chat-backend-configuration-point`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`
- **acceptance_criteria**:
  - New `chatAppId` prop (default `DEFAULT_CHAT_APP_ID`), forwarded to the auto-mounted `<CnAiCompanion :chat-app-id="chatAppId" />`
  - Docblock documents the deferred `hermiq` flip
  - `npm run lint` passes
- [x] 3.4 Add prop + forward to auto-mounted companion

## 4. Tests

### Task 4.1: Extend + add vitest specs (default + override)
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-configurable-chat-backend-app-id`
- **files**: `tests/composables/aiChatConfig.spec.js` (new), `tests/composables/useAiChatStream.spec.js`, `tests/components/CnAiCompanion.spec.js`, `tests/components/CnAiHistoryDialog.spec.js` (new)
- **acceptance_criteria**:
  - `aiChatConfig.spec.js` asserts `DEFAULT_CHAT_APP_ID === 'openregister'` and every builder for both default and `hermiq` override
  - `useAiChatStream.spec.js` asserts stream/send/loadConversation URLs use `openregister` by default and `hermiq` on override
  - `CnAiCompanion.spec.js` asserts the health-probe URL uses the default and an overridden `chatAppId`
  - `CnAiHistoryDialog.spec.js` asserts the conversation-list URL uses the default and an overridden `chatAppId`
  - The affected suites pass under the repo test runner
- [x] 4.1 Extend/add specs; suites green

## 5. Validation

### Task 5.1: Gates
- **acceptance_criteria**:
  - `openspec validate chat-appid-flip --strict` passes
  - eslint clean on all touched files
- [x] 5.1 openspec + eslint green
