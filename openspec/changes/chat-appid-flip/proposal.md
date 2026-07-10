---
kind: code
depends_on:
  # Cross-repo references (repo#NNN). These live in other repos and are NOT
  # materialized here — they gate the DEFAULT-VALUE flip described below, not
  # this parameterization change (which is safe to land independently today).
  - hermiq#13          # hermiq agent-engine-port — Hermiq's chat/agent engine (MERGED). Behind a default-OFF feature flag.
  - openregister#proxy # or-chat-proxy-deprecation (Appendix C) — OR keeps /api/chat/* + /api/agents as 308/proxy to Hermiq for >=1 release (FUTURE, not yet numbered).
chain:
  - agent-engine-schemas   # hermiq — durable object shape (predecessor)
  - agent-engine-port      # hermiq — the ported engine (hermiq#13, MERGED)
  - agent-data-migration   # hermiq — OR tables -> hermiq register objects
  - or-tool-registry-facade # openregister — Appendix A
  - chat-appid-flip        # this change (nextcloud-vue) — Appendix B
  - or-chat-proxy-deprecation # openregister — Appendix C (compat window)
---

# chat-appid-flip

## Why

The `CnAiCompanion` widget in `@conduction/nextcloud-vue` hardcodes `openregister`
as the chat/agent backend in four call sites across three files:

- `src/composables/useAiChatStream.js` — `STREAM_URL`, `SEND_URL`, and the
  `loadConversation()` messages URL.
- `src/components/CnAiCompanion/CnAiCompanion.vue` — `HEALTH_URL` (the mount-time
  health probe).
- `src/dialogs/CnAiHistoryDialog.vue` — the conversation-list URL.

Per **hydra ADR-034 "Amendment 2026-07-05"** the agent engine is moving out of
OpenRegister and into **Hermiq** (a true ADR-022 leaf that consumes only generic
OR abstractions — object storage, RBAC, audit, vectors, tool registry). Once
Hermiq owns the engine, every one of the ~17 apps that mount `CnAiCompanion`
through `CnAppRoot` needs the widget to call Hermiq's routes instead of
OpenRegister's. Four hardcoded strings across three files is exactly the
"4-file choke point" the plan (`SPECTR-NEXTCLOUD-PLAN.md` §7.4 step 5) calls
out: it must become **one** configuration point.

The related chat-history 404 fix (conversation/history URLs matching no OR route)
already landed independently in **ncvue#83** — this change is purely the app-id
parameterization that remains.

## What Changes

- **NEW** `src/composables/aiChatConfig.js` — the single configuration point:
  - `DEFAULT_CHAT_APP_ID` constant (the default backend app id).
  - URL builders (`chatApiBase`, `chatStreamUrl`, `chatSendUrl`, `chatHealthUrl`,
    `conversationsUrl`, `conversationMessagesUrl`) that derive every widget HTTP
    path from an app id, so switching backends is a single value change.
- **MODIFY** `useAiChatStream.js` — accepts a second `options` arg
  (`{ chatAppId }`, default `DEFAULT_CHAT_APP_ID`); all three of its URLs are
  built from that id. Backward compatible — existing `useAiChatStream(instance)`
  callers keep the `openregister` default.
- **MODIFY** `CnAiCompanion.vue` — new `chatAppId` prop (default
  `DEFAULT_CHAT_APP_ID`); health probe uses `chatHealthUrl(this.chatAppId)`;
  `chatAppId` is passed into `useAiChatStream(this, { chatAppId })` and forwarded
  down through `CnAiChatPanel` to `CnAiHistoryDialog`.
- **MODIFY** `CnAiChatPanel.vue` — new `chatAppId` prop, forwarded to
  `CnAiHistoryDialog`.
- **MODIFY** `CnAiHistoryDialog.vue` — new `chatAppId` prop; conversation-list
  URL uses `conversationsUrl(this.chatAppId)`.
- **MODIFY** `CnAppRoot.vue` — new `chatAppId` prop (default
  `DEFAULT_CHAT_APP_ID`), forwarded to the auto-mounted `<CnAiCompanion>`. This
  is the app-level single configuration point: a consuming app sets it once.
- **MODIFY** `src/composables/index.js`, `src/index.js`, `src/types/index.d.ts`
  — export the config module + builders and type the new `options` arg.
- **NO BREAKING CHANGES.** Every new prop/option defaults to
  `DEFAULT_CHAT_APP_ID` (`openregister`), so apps that do nothing keep today's
  behaviour exactly.

### Default value — deliberately `openregister`, NOT `hermiq` (deferred flip)

ADR-034's Amendment and `SPECTR-NEXTCLOUD-PLAN.md` §7.4 step 5 sequence the
default flip so consuming apps never break during the move:

- Hermiq's chat engine (`hermiq#13`) ships **behind a default-OFF feature flag**.
- OpenRegister keeps `/api/chat/*` + `/api/agents` as a **308/proxy compat shim
  for >= 1 release** — a *separate* openregister change (`or-chat-proxy-deprecation`,
  Appendix C) that is **not yet shipped**.

Until **both** the Hermiq engine flag is on by default **and** the OR compat
proxy exists, the only backend that actually answers chat calls on a stock
instance today is `openregister`. Therefore this change keeps `openregister` as
the **safe default** and makes the backend **overridable now**. Flipping the
default to `hermiq` is then a **one-line change** in `aiChatConfig.js`
(`DEFAULT_CHAT_APP_ID = 'hermiq'`), to be landed on the coordinated
`@conduction/nextcloud-vue` **beta bump** once its two gates are live. Deployments
that want Hermiq early can already pass `:chat-app-id="'hermiq'"` to `CnAppRoot`
today. This choice matches ADR-034's Amendment verbatim: *"`chatAppId` defaults
to `openregister` today and flips to `hermiq` on a coordinated
`@conduction/nextcloud-vue` version bump."*

## Impact

- **Affected apps**: all ~17 that mount `CnAiCompanion` via `CnAppRoot`
  (`opencatalogi`, `openconnector`, `docudesk`, `decidesk`, `launchpad`,
  `softwarecatalog`, `larpingapp`, `zaakafhandelapp`, `procest`, `pipelinq`,
  `openregister`, the ExApp sidecars). They pick up the new configuration point
  on a lib bump with **zero** template changes; behaviour is unchanged until the
  default flip.
- **Backward compatibility**: fully additive. All new props/options default to
  `openregister`.
- **Theming**: none (routing-target change only, no CSS).
- **Test coverage**: extend the ncvue#83 specs for the three files plus a unit
  spec for `aiChatConfig.js`, asserting each URL resolves against `chatAppId` in
  both the default (`openregister`) and override (`hermiq`) cases.
- **Rollback**: bump the consuming app back to a previous nc-vue version. No data
  migration.

## Out of scope

- **The default flip to `hermiq`** — deferred, one-line follow-up gated on
  `hermiq#13` being enabled by default and `or-chat-proxy-deprecation` (Appendix
  C) shipping. Documented above so it is a trivial later change.
- **OpenRegister's compat proxy / route redirects** — `or-chat-proxy-deprecation`
  in the openregister repo (Appendix C), not nextcloud-vue.
- **Hermiq's engine, tool loop, LLM providers, and the OR data migration** —
  `agent-engine-port` / `agent-engine-schemas` / `agent-data-migration` in the
  hermiq repo, and `or-tool-registry-facade` (Appendix A) in openregister.
- **The chat-history 404 fix** — already merged (ncvue#83).

## See also

- Hydra **ADR-034** (`hydra/openspec/architecture/adr-034-ai-chat-companion.md`)
  — "Amendment 2026-07-05" (backend move + `chatAppId`) is the contract this
  change implements.
- **`SPECTR-NEXTCLOUD-PLAN.md`** §7.4 step 5 — the migration-sequence step this
  change realizes; Appendix B of the hermiq `agent-engine-schemas` design.md is
  the proposal-shaped brief for this change.
- `nextcloud-vue/openspec/changes/archive/2026-06-14-ai-chat-companion-widget/`
  — the change that introduced `CnAiCompanion` + the four hardcoded call sites.
