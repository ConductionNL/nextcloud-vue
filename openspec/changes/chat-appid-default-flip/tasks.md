# Tasks: chat-appid-default-flip

## 1. Flip the default

- [x] 1.1 In `src/composables/aiChatConfig.js`: set `DEFAULT_CHAT_APP_ID = 'hermiq'` and rewrite the "DEFAULT VALUE — deliberately openregister" doc block to describe the post-flip state (default `hermiq`; `openregister` reachable as explicit `chatAppId` override during OR's compat window, openregister#305; prerequisites met per ADR-034 Amendment 2026-07-05)
  - `chatApiBase('')` / nullish fallback semantics unchanged
  - update the `@return` example in `chatApiBase`'s docblock to the hermiq path

## 2. Doc comments that describe the flip as deferred

- [x] 2.1 Update the `chatAppId` prop docblock in `src/components/CnAiCompanion/CnAiCompanion.vue` (currently "Defaults to `openregister`… default flip to `hermiq` is a deferred, coordinated change") to state the default is `hermiq` and `openregister` is the compat-window override; sweep `CnAppRoot.vue` / `CnAiChatPanel.vue` / `CnAiHistoryDialog.vue` docblocks for the same stale phrasing

## 3. Tests

- [x] 3.1 `tests/composables/aiChatConfig.spec.js`: default-backend test asserts `hermiq` for `DEFAULT_CHAT_APP_ID` and all six builders; override test exercises `openregister` as the explicit override; empty/nullish fallback test asserts the `hermiq` base
- [x] 3.2 `tests/composables/useAiChatStream.spec.js`: default-stream test asserts `/apps/hermiq/...`; keep an explicit-override case pointing at `openregister`; conversation-messages default asserts `hermiq`
- [x] 3.3 Sweep remaining component tests (`CnAiChatPanel.spec.js`, `CnChatPage.spec.js`, CnAppRoot tests) for assertions pinning the old default and update them

## 4. Validate

- [x] 4.1 `npm run lint` and `npm test` green in the worktree; `npm run build` (dist) succeeds — the flip ships to consumers only via the coordinated beta publish + consumer rebuilds (out of scope here, tracked in the rollout)
