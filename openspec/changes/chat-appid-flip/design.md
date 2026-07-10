# Design: chat-appid-flip

## Context

`CnAiCompanion` (shipped by the archived `ai-chat-companion-widget` change) talks
to a Nextcloud app that owns the chat/agent engine over HTTP. Historically that
app was hardcoded as `openregister` in four call sites across three files. Per
hydra ADR-034 "Amendment 2026-07-05" the engine is moving to Hermiq, so the
backend must become a single configuration point. This change was verified
against the nextcloud-vue `beta` HEAD (the fleet-exception base branch), not
trusted from the plan text — the exact call sites below were re-confirmed in the
working tree.

## Goals / Non-Goals

**Goals:**
- Replace the four hardcoded `openregister` slugs with one configuration point
  threaded from `CnAppRoot`.
- Keep the change fully backward compatible: every new prop/option defaults to
  the current backend so apps that do nothing see no behaviour change.
- Make the eventual default flip to `hermiq` a one-line change.

**Non-Goals:**
- Flipping the default to `hermiq` now (gated — see Decisions).
- Any OpenRegister or Hermiq code (routes, proxy, engine, migration).
- Re-doing the chat-history 404 fix (already merged, ncvue#83).

## Decisions

**Shared config module + a threaded prop — both, not one.** The brief allowed
"a prop on `CnAiCompanion` defaulting to a module-level constant, OR a config
export in a shared module." We do both because they play different roles:

- `src/composables/aiChatConfig.js` is the **single source of truth** for the
  default backend id and the URL shapes. Centralising the URL construction means
  the four call sites can never drift (they no longer each spell out
  `/index.php/apps/openregister/api/...`), and the deferred default flip is one
  line in one file.
- A `chatAppId` **prop** on `CnAppRoot` → `CnAiCompanion` → `CnAiChatPanel` →
  `CnAiHistoryDialog` (and an `options.chatAppId` on `useAiChatStream`) is the
  **per-mount override**. This matches how `CnAppRoot` already threads `appId`
  down and lets a single app point the widget at a different backend without a
  library fork. `CnAppRoot` is the app-level choke point the ADR amendment names
  ("`@conduction/nextcloud-vue`'s `chatAppId` config").

`chatAppId` is deliberately **distinct from `cnAppId`** (the consuming app's own
slug). The chat backend is a fleet-shared service (`openregister`/`hermiq`), not
the app that happens to mount the widget — so it defaults to
`DEFAULT_CHAT_APP_ID`, never to the host app's id.

**Default stays `openregister` (safe), flip is deferred.** ADR-034's Amendment
and plan §7.4 step 5 both state the default is `openregister` **today** and flips
to `hermiq` on a coordinated beta bump. Two independent gates must be live first:
(1) Hermiq's engine (`hermiq#13`) is behind a default-OFF flag; (2) OR's
`/api/chat/*` compat proxy (`or-chat-proxy-deprecation`, Appendix C) is not yet
shipped. Flipping the default before those exist would point 17 apps at a
backend that returns nothing on a stock instance. So this change parameterizes
now and documents the one-line flip (`DEFAULT_CHAT_APP_ID = 'hermiq'` in
`aiChatConfig.js`) for the coordinated bump. **This does not contradict Appendix
B** — Appendix B's "flip the default from `openregister` to `hermiq` on the
coordinated beta bump" is precisely the deferred step; landing the
parameterization first is the safe way to reach it.

**URL builders fall back to the default on empty input.** `chatApiBase('')`
returns the `openregister` base rather than `/index.php/apps//api`, so a
mis-wired prop degrades to today's behaviour instead of producing a broken URL.

**`useAiChatStream` takes options, not a second positional string.** A
`{ chatAppId }` options bag keeps room for future transport knobs and reads
clearly at the call site (`useAiChatStream(this, { chatAppId: this.chatAppId })`).

## Risks / Trade-offs

- **Sequencing risk on the deferred flip.** If the default is flipped before the
  OR compat proxy ships, apps pinned to an older nc-vue break. Mitigated by (a)
  keeping the safe default here, (b) documenting the two gates in the proposal +
  the `aiChatConfig.js` docblock, and (c) the compat-proxy window itself
  (Appendix C) once it lands.
- **Prop-drilling depth.** `chatAppId` threads through four component layers.
  Accepted: it mirrors the existing `appId` drill and avoids a second
  provide/inject symbol for a value that is almost always the default. The
  `useAiChatStream` composable reads it as an option, not via inject, so the
  transport layer stays testable in isolation.
- **A new public export surface.** `DEFAULT_CHAT_APP_ID` + six URL builders are
  now part of the library's API. Accepted: they are small, pure, and give
  consuming apps / tests a stable way to assert the backend without string
  literals.

## Migration

- Additive: consuming apps pick up the config point on a lib bump with no
  template change; behaviour is identical until the default flip.
- The default flip lands later as a one-line change on the coordinated beta bump,
  once `hermiq#13` is default-on and `or-chat-proxy-deprecation` has shipped.
- Rollback: revert the nc-vue bump in the consuming app. No data migration.
